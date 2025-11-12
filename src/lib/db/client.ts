import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Singleton pattern for Supabase client
let supabaseClientSingleton: SupabaseClient<Database> | null = null;
let supabaseServerSingleton: SupabaseClient<Database> | null = null;

/**
 * Get Supabase client for client-side operations
 * Uses anon key with RLS
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseClientSingleton) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }

    supabaseClientSingleton = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return supabaseClientSingleton;
}

/**
 * Get Supabase client for server-side operations
 * Uses service role key - bypasses RLS
 * ONLY use for operations that require admin access
 */
export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (!supabaseServerSingleton) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Missing Supabase server environment variables. Please check SUPABASE_SERVICE_ROLE_KEY'
      );
    }

    supabaseServerSingleton = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseServerSingleton;
}

/**
 * Create a Supabase client with a specific user's session
 * For server-side operations that should respect RLS
 */
export function createSupabaseClientWithSession(accessToken: string): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
