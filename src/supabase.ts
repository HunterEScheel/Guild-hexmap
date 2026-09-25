import { createBrowserClient } from '@supabase/ssr';

/**
 * The map lives in a Supabase project it shares with other apps, which is why every
 * table, RPC and realtime channel it touches is prefixed `hexmap_`. The schema and
 * Edge Functions are kept in the jaeg.click repo, not here.
 *
 * Players use it without signing in — they identify themselves by name — so their
 * requests are anonymous. The table policies allow public reads, and the RPCs are
 * granted to `anon`. The admin signs in, and the `admin-action` Edge Function
 * accepts writes only from the one account listed in `site_admins`.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — see .env.example');
}

// Every app on *.jaeg.click shares one sign-in. The session lives in a cookie on
// the parent domain rather than in this origin's localStorage, so signing in on
// any subdomain signs you in on all of them. Locally there is no parent domain to
// share, and the cookie stays on the host.
const hostname = typeof location === 'undefined' ? '' : location.hostname;
const onJaegClick = hostname === 'jaeg.click' || hostname.endsWith('.jaeg.click');

export const supabase = createBrowserClient(url, anonKey, {
  cookieOptions: onJaegClick
    ? { domain: '.jaeg.click', path: '/', sameSite: 'lax', secure: true, maxAge: 400 * 24 * 60 * 60 }
    : undefined,
});
