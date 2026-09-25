import { createClient } from '@supabase/supabase-js';

/**
 * The map lives in a Supabase project it shares with other apps, which is why every
 * table, RPC and realtime channel it touches is prefixed `hexmap_`. The schema and
 * Edge Functions are kept in the jaeg.click repo, not here.
 *
 * It is reached without signing in — players identify themselves by name and admin
 * is a PIN checked server-side by the `admin-action` Edge Function — so the requests
 * here are anonymous. The table policies allow public reads, and the RPCs are
 * granted to `anon`.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — see .env.example');
}

export const supabase = createClient(url, anonKey);
