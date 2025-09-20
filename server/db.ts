import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Check for database URL in environment variables
const DATABASE_URL = process.env.DATABASE_URL || process.env.REPLIT_DB_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL or REPLIT_DB_URL must be set. Please provision a database in Replit.');
  process.exit(1);
}