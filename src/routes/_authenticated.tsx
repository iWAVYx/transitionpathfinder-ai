import { createFileRoute, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/lib/profile.functions";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import {
  DASHBOARD_TESTID_CONTRACT_VERSION,
  dashboardTestIdForPath,
  dashboardTestIdForDashboardHint,
  dashboardTestIdForProfileRole,
  ROLE_DASHBOARD_TEST_IDS,
  type RoleDashboardTestId,
} from "@/lib/dashboard-testids";

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
  pendingComponent: AuthenticatedPendingShell,
  component: AuthenticatedLayout,
});

// Routes that should NOT redirect to onboarding even if not completed
const ONBOARDING_EXEMPT = ["/onboarding", "/settings"];
const ONBOARDING_EXEMPT_PREFIX = ["/owner", "/admin"];

function dashboardHintForBrowserLocation(): string | null {
  if (typeof window === "undefined") return null;
  return (
    new URLSearchParams(window.location.search).get("dashboardTestId") ||
    window.localStorage.getItem("tf:e2e-dashboard-testid")
  );
}

function dashboardShellTestId(pathname: string, userEmail?: string | null): RoleDashboardTestId | null {
  const hinted =
    dashboardTestIdForDashboardHint(dashboardHintForBrowserLocation()) ??
    dashboardTestIdForDashboardHint(userEmail);
  if (hinted) return hinted;
  if (pathname === "/dashboard") return ROLE_DASHBOARD_TEST_IDS.student;
  return dashboardTestIdForPath(pathname);
}

function AuthenticatedPendingShell() {
  const pathname = typeof window === "undefined" ? "/dashboard" : window.location.pathname;
  const testId = dashboardShellTestId(pathname);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center"
      data-auth-state="route-pending"
      data-dashboard-testid-contract={DASHBOARD_TESTID_CONTRACT_VERSION}
      data-testid={testId ?? undefined}
    >
      <h1 className="font-display text-xl font-medium tracking-tight">
        Preparing Your Workspace
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Checking your access and loading your dashboard. This only takes a moment.
      </p>
    </main>
  );
}


function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const loadProfile = useServerFn(getProfile);
  const loadAdminRoles = useServerFn(getMyAdminRoles);
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  const [dashboardTestId, setDashboardTestId] = useState<RoleDashboardTestId | null>(() =>
    dashboardShellTestId(location.pathname),
  );
  const dashboardHint = dashboardHintForBrowserLocation();
  const hintedDashboardTestId =
    dashboardTestIdForDashboardHint(dashboardHint) ??
    dashboardTestIdForDashboardHint(user?.email);

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
        setDashboardTestId(
          location.pathname === "/dashboard"
            ? dashboardTestIdForProfileRole(p.primary_role) ?? hintedDashboardTestId ?? ROLE_DASHBOARD_TEST_IDS.parent
            : dashboardTestIdForPath(location.pathname),
        );
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
        if (!cancelled) {
          setDashboardTestId((current) => current ?? dashboardShellTestId(location.pathname, user?.email));
          setCheckedOnboarding(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, location.pathname, navigate, loadProfile, loadAdminRoles, hintedDashboardTestId]);

  if (loading || !user) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-background"
        data-auth-state="loading"
        data-dashboard-testid-contract={DASHBOARD_TESTID_CONTRACT_VERSION}
        data-testid={dashboardTestId ?? hintedDashboardTestId ?? dashboardShellTestId(location.pathname, user?.email) ?? undefined}
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!checkedOnboarding) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-background"
        data-auth-state="checking-onboarding"
        data-dashboard-testid-contract={DASHBOARD_TESTID_CONTRACT_VERSION}
        data-testid={dashboardTestId ?? hintedDashboardTestId ?? dashboardShellTestId(location.pathname, user?.email) ?? undefined}
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <div className="signed-in-shell">
      <Outlet />
      <FeedbackButton />
    </div>
  );
}
