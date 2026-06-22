import { useEffect, useMemo, useState } from "react";
import { useLocation } from "@tanstack/react-router";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

type AuthRenderDiagnosticProps = {
  branch: "LoginPage" | "TwoFactorVerification";
  loginFormRendered: boolean;
  twoFactorVerificationRendered: boolean;
  pendingChallengeExists?: boolean;
};

export function AuthRenderDiagnostic({
  branch,
  loginFormRendered,
  twoFactorVerificationRendered,
  pendingChallengeExists = false,
}: AuthRenderDiagnosticProps) {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [twoFactorPending, setTwoFactorPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setTwoFactorPending(false);
      return () => {
        cancelled = true;
      };
    }

    supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(({ data }) => {
        if (cancelled) return;
        setTwoFactorPending(Boolean(data?.nextLevel === "aal2" && data.currentLevel !== "aal2"));
      })
      .catch(() => {
        if (!cancelled) setTwoFactorPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const diagnostic = useMemo(
    () => ({
      type: "auth-render-diagnostic",
      pathname: location.pathname,
      branch,
      authenticated: Boolean(user),
      authLoading: loading,
      twoFactorPending,
      pendingChallengeExists,
      loginFormRendered,
      twoFactorVerificationRendered,
    }),
    [
      branch,
      loading,
      location.pathname,
      loginFormRendered,
      pendingChallengeExists,
      twoFactorPending,
      twoFactorVerificationRendered,
      user,
    ],
  );

  useEffect(() => {
    console.info("[auth-render-diagnostic]", diagnostic);
  }, [diagnostic]);

  return (
    <pre hidden data-testid="auth-render-diagnostic">
      {JSON.stringify(diagnostic, null, 2)}
    </pre>
  );
}