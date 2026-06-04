import { createFileRoute, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated")({
  // Server-side gate: redirect unauthenticated SSR/preload requests before rendering.
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/login",
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
      .then((p) => {
        if (cancelled) return;
        if (!p.onboarding_completed) {
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
