/**
 * Supabase configuration
 *
 * Environment variables should be set in:
 * - .env.local for local development
 * - GitHub Actions secrets for production deployment
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  options: {
    auth: {
      persistSession: false, // No auth needed for now (public read, optional auth for edit)
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-application': 'soyagaci-family-tree' },
    },
  },
} as const;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
}
