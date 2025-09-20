import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Check for Supabase credentials in environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  console.error('Please set up your Supabase project and add the environment variables.');
  process.exit(1);
}

// Create Supabase client for auth and real-time features
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY);

// Create Supabase admin client for database operations
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create PostgreSQL connection for Drizzle ORM
const connectionString = `postgresql://postgres:[YOUR-PASSWORD]@${SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')}.supabase.co:5432/postgres`;

// For Supabase, we need to construct the connection string differently
// The connection string should be available in your Supabase project settings
const supabaseConnectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!supabaseConnectionString) {
  console.error('Error: SUPABASE_DATABASE_URL or DATABASE_URL must be set.');
  console.error('Please get your database connection string from Supabase project settings.');
  process.exit(1);
}

const client = postgres(supabaseConnectionString, {
  prepare: false,
  max: 10,
});

export const db = drizzle(client, { schema });

console.log('✅ Connected to Supabase database');