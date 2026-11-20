import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { session: Session | null; user: User | null; loading: boolean };
const signedOut: AuthState = { session: null, user: null, loading: false };

// Local session shape only. Every protected server function still verifies its caller.
function sessionState(session: Session | null | undefined): AuthState {
  if (!session || typeof session.user?.id !== "string" || !session.user.id.trim()) return signedOut;
  return { session, user: session.user, loading: false };
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ ...signedOut, loading: true });

  useEffect(() => {
    let cancelled = false;
    let revision = 0;
    // Capture before subscribing: some clients emit an initial event synchronously.
    const readRevision = revision;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      revision += 1;
      setAuth(sessionState(session));
    });
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled || revision !== readRevision) return;
        setAuth(error ? signedOut : sessionState(data?.session));
      } catch {
        if (!cancelled && revision === readRevision) setAuth(signedOut);
      }
    })();
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { ...auth, signOut: () => supabase.auth.signOut() };
}
