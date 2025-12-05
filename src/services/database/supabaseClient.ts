import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig, isSupabaseConfigured } from '../../config/supabase';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client singleton
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      supabaseConfig.options
    );
  }

  return supabaseClient;
}

/**
 * Check if database is available
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('members').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
