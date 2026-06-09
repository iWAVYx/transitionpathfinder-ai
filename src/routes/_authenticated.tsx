import { createFileRoute, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/lib/profile.functions";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";

export const Route = createFileRoute("/_authenticated")({
  // Client-only gate: Supabase stores the session in localStorage, which the server
  // cannot read. Running this in SSR would either redirect every authenticated user
  // on hard refresh or silently pass without verifying the viewer. With ssr:false
  // the gate executes in the browser where the session is available, and protected
  // server functions are still enforced by `requireSupabaseAuth` middleware.
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.pathname },
      });
    }
    // 2FA gate: if the user has a verified TOTP factor but hasn't completed
    // the challenge this session, bounce to /login/2fa. The /login/2fa route
    // itself lives outside _authenticated so this doesn't loop.
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      throw redirect({
        to: "/login/2fa",
        search: { redirect: location.pathname },
      });
    }
  },
  component: AuthenticatedLayout,
});

// Routes that should NOT redirect to onboarding even if not completed
const ONBOARDING_EXEMPT = ["/onboarding", "/settings"];
const ONBOARDING_EXEMPT_PREFIX = ["/owner", "/admin"];

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const loadProfile = useServerFn(getProfile);
  const loadAdminRoles = useServerFn(getMyAdminRoles);
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);

  // Client-side fallback: catch session expiry mid-session.
  useEffect(() => {
    if (!loading && !user) {
      navigate({
        to: "/login",
        search: { redirect: typeof window !== "undefined" ? window.location.pathname : "/dashboard" },
        replace: true,
      });
    }
  }, [user, loading, navigate]);

  // Onboarding gate: send new users to /onboarding before they hit the dashboard.
  useEffect(() => {
    if (!user || loading) return;
    const path = location.pathname;
    if (
      ONBOARDING_EXEMPT.includes(path) ||
      ONBOARDING_EXEMPT_PREFIX.some((p) => path.startsWith(p))
    ) {
      setCheckedOnboarding(true);
      return;
    }
    let cancelled = false;
    loadProfile()
      .then(async (p) => {
        if (cancelled) return;
        if (!p.onboarding_completed) {
          // Platform admins (admin_roles entry) bypass /onboarding and land on /owner.
          try {
            const admin = await loadAdminRoles();
            if (cancelled) return;
            if (admin?.isPlatformAdmin) {
              navigate({ to: "/owner", replace: true });
              setCheckedOnboarding(true);
              return;
            }
          } catch {
            /* fall through to onboarding */
          }
          navigate({ to: "/onboarding", replace: true });
        }
        setCheckedOnboarding(true);
      })
      .catch(() => {
        if (!cancelled) setCheckedOnboarding(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, location.pathname, navigate, loadProfile]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!checkedOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="signed-in-shell">
      <Outlet />
    </div>
  );
}
