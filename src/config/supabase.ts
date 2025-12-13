/**
 * Supabase configuration
 *
 * Environment variables should be set in:
 * - .env.local for local development
 * - GitHub Actions secrets for production deployment
 *
 * Supports both legacy and new API key formats:
 * - Legacy: VITE_SUPABASE_ANON_KEY (works until October 2025)
 * - New: VITE_SUPABASE_PUBLISHABLE_KEY (sb_publishable_...)
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

// Support both new publishable key and legacy anon key
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||  // New format (preferred)
  import.meta.env.VITE_SUPABASE_ANON_KEY ||         // Legacy format (backward compatible)
  '';

export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_KEY, // Works with both formats
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
  return SUPABASE_URL !== '' && SUPABASE_KEY !== '';
}
