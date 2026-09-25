import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";

/**
 * Admin is one signed-in Supabase account: whichever account the database lists
 * in `site_admins` (seeded in the jaeg.click repo). Players never sign in; only
 * the admin does, and the session is a cookie shared across *.jaeg.click, so an
 * admin signed in on any of those apps is signed in here too.
 *
 * `isAdmin` only decides what the UI shows. The `admin-action` Edge Function
 * checks the caller's JWT against `site_admins` on every write, so a tampered
 * client gains nothing.
 */
export function useAdminMode() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setSessionLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSessionLoaded(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase.rpc("is_site_admin").then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.warn("is_site_admin failed:", error.message);
      setIsAdmin(!error && data === true);
      setCheckedUserId(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Still working out who this is: the stored session hasn't loaded, or a user
  // is signed in whose admin status hasn't come back yet.
  const checking = !sessionLoaded || (userId != null && checkedUserId !== userId);

  return {
    user,
    isAdmin: userId != null && checkedUserId === userId && isAdmin,
    checking,
    signOut,
  };
}
