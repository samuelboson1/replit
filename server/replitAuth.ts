import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  try {
    console.log("📝 upsertUser called with claims:", { 
      sub: claims["sub"], 
      email: claims["email"], 
      first_name: claims["first_name"],
      originalRole: claims["role"]
    });
    
    // Check if user already exists to preserve their role
    let existingUser;
    try {
      existingUser = await storage.getUser(claims["sub"]);
    } catch (error) {
      // User doesn't exist, continue with role determination
    }

    let userRole;
    if (existingUser && existingUser.role) {
      // Preserve existing role from database
      userRole = existingUser.role;
      console.log("🔄 Preserving existing role:", userRole, "for user:", claims["email"]);
    } else {
      // New user - determine role from claims or default
      userRole = claims["role"];
      if (!userRole) {
        // For development/testing ONLY, assign manager role to specific emails
        if (process.env.NODE_ENV === "development" || process.env.ALLOW_DEV_ROLE_OVERRIDE === "true") {
          const email = claims["email"]?.toLowerCase();
          if (email && (
            email.includes("manager") || 
            email.includes("admin") || 
            email === "manager@test.com" ||
            email === "admin@hotel.com" ||
            email === "sambosondigital@gmail.com"
          )) {
            userRole = "manager";
          } else {
            userRole = "housekeeper";
          }
        } else {
          // In production, default to housekeeper unless explicitly set in OIDC claims
          userRole = "housekeeper";
        }
      }
      console.log("🎯 Role determined for new user:", userRole, "for email:", claims["email"]);
    }

    const result = await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      role: userRole,
    });
    
    console.log("✅ upsertUser successful:", { id: result.id, email: result.email, role: result.role });
    return result;
  } catch (error) {
    console.error("❌ upsertUser failed:", error);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    
    // Upsert user and get the actual user ID from database
    const dbUser = await upsertUser(tokens.claims());
    
    // Update session to use the actual database user ID instead of original claims sub
    const userSession = user as any;
    if (userSession.claims) {
      console.log("🔄 Updating session sub from", userSession.claims.sub, "to", dbUser.id);
      userSession.claims.sub = dbUser.id;
    }
    
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

// Role-based access control middleware
export const requireRole = (...allowedRoles: string[]): RequestHandler => {
  return async (req: any, res, next) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      console.error("Error checking user role:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};