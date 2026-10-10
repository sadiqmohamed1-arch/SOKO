import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Only the public project URL and anon key belong in the browser bundle.
// Service-role and secret keys must never be read here or prefixed with VITE_.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.',
    );
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'soko-supabase-auth',
      },
    });
  }
  return client;
}
