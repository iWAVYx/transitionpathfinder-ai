import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let revision = 0;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (cancelled) return;
      revision += 1;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    const readRevision = revision;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled || revision !== readRevision) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled || revision !== readRevision) return;
        setSession(null);
        setUser(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    session,
    loading,
    signOut: () => supabase.auth.signOut(),
  };
}
