import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use a fallback DATABASE_URL for development if not set
const DATABASE_URL = process.env.DATABASE_URL || process.env.REPLIT_DB_URL || 'postgresql://localhost:5432/defaultdb';
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
if (!process.env.DATABASE_URL && !process.env.REPLIT_DB_URL) {
}
    "DATABASE_URL or REPLIT_DB_URL must be set. Did you forget to provision a database?",
if (!DATABASE_URL || DATABASE_URL === 'postgresql://localhost:5432/defaultdb') {
  console.warn('Warning: Using fallback DATABASE_URL. Please provision a database in Replit.');
}
export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle({ client: pool, schema });