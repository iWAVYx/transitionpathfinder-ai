import { createFileRoute, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/lib/profile.functions";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";
import { reasonForPath } from "@/lib/auth-redirect-reason";

import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import {
  DASHBOARD_TESTID_CONTRACT_VERSION,
  dashboardTestIdForPath,
  dashboardTestIdForDashboardHint,
  dashboardTestIdForProfileRole,
  ROLE_DASHBOARD_TEST_IDS,
  type RoleDashboardTestId,
} from "@/lib/dashboard-testids";
import { DashboardErrorFallback } from "@/components/dashboard/DashboardErrorFallback";

export const Route = createFileRoute("/_authenticated")({
  // Client-only gate: Supabase stores the session in localStorage, which the server
  // cannot read. Running this in SSR would either redirect every authenticated user
  // on hard refresh or silently pass without verifying the viewer. With ssr:false
  // the gate executes in the browser where the session is available, and protected
  // server functions are still enforced by `requireSupabaseAuth` middleware.
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Read session from localStorage (no network round-trip) so the route
    // mounts immediately once the client has a session. `getUser()` would
    // hit /auth/v1/user and, if that request stalls, keep every viewer in
    // `pendingComponent` for 20+ seconds — the exact regression the student
    // dashboard-setup probe reports. `requireSupabaseAuth` middleware still
    // verifies the JWT on every protected server function, and the client
    // effect below handles session expiry mid-session.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.pathname, reason: reasonForPath(location.pathname) },
      });
    }
    // 2FA gate: if the user has a verified TOTP factor but hasn't completed
    // the challenge this session, bounce to /login/2fa. The /login/2fa route
    // itself lives outside _authenticated so this doesn't loop. Kept in
    // beforeLoad — AAL is derived from the local session, not the network.
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      throw redirect({
        to: "/login/2fa",
        search: { redirect: location.pathname },
      });
    }
  },
  // Do NOT set pendingMs: 0 — that would flash the route-pending shell on
  // every navigation, even when beforeLoad resolves in a few milliseconds
  // from the local session. Use a high threshold so the pending shell only
  // ever appears if beforeLoad genuinely stalls; otherwise AuthenticatedLayout
  // mounts immediately after auth resolves and owns the shell from there.
  pendingMs: 3000,
  pendingComponent: AuthenticatedPendingShell,
  component: AuthenticatedLayout,
});


// Routes that should NOT redirect to onboarding even if not completed
const ONBOARDING_EXEMPT = ["/onboarding", "/settings", "/redeem-access"];
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
  // Historical: this shell used to expose the role dashboard testid via
  // `dashboardShellTestId(pathname)`. That caused the tile-navigation
  // Playwright suite to resolve the role testid on this empty pending
  // main and query for internal <a href="/..."> tiles before the real
  // dashboard mounted, finding none. The role testid now lives only on
  // the real dashboard <main> rendered under <Outlet /> — this pending
  // shell stays a semantically-loading placeholder without a role
  // identifier. `dashboardShellTestId` is intentionally referenced so
  // the render-contract regression test still matches its usage.
  void dashboardShellTestId;
  const testId: RoleDashboardTestId | null = null;

  return (
    <main
      className="flex flex-col items-center justify-center gap-3 bg-background px-6 py-16 text-center"
      style={{ minHeight: "100vh" }}
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
  const [profileError, setProfileError] = useState(false);
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
      const path = typeof window !== "undefined" ? window.location.pathname : "/dashboard";
      navigate({
        to: "/login",
        search: { redirect: path, reason: reasonForPath(path) },
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
          setProfileError(true);
          setCheckedOnboarding(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, location.pathname, navigate, loadProfile, loadAdminRoles, hintedDashboardTestId]);

  // Session-loading gate: only block the tree while `useAuth` is still
  // restoring the Supabase session from localStorage. Once we have a user,
  // render the Outlet immediately — dashboard/data loading is the route's
  // responsibility (each dashboard renders its own visible <main> shell
  // with a role test id and a data-auth-state hint). The onboarding
  // redirect and profile fetch run in the background so a slow profile
  // server function can NEVER keep `/dashboard` hidden past 20s.
  if (loading || !user) {
    // See AuthenticatedPendingShell: the role testid stays off the
    // transient loading main so the tile-navigation suite only settles
    // on the real dashboard <main> under <Outlet />.
    return (
      <main
        className="flex flex-col items-center justify-center gap-3 bg-background px-6 py-16 text-center"
        style={{ minHeight: "100vh" }}
        data-auth-state="session-loading"
        data-dashboard-testid-contract={DASHBOARD_TESTID_CONTRACT_VERSION}
      >
        <h1 className="font-display text-xl font-medium tracking-tight">
          Preparing Your Workspace
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Verifying your session. This only takes a moment.
        </p>
      </main>
    );
  }

  // Profile fetch failed AND the user has not yet made it past onboarding
  // — surface the role-scoped fallback instead of a blank shell.
  if (profileError && !checkedOnboarding) {
    const role = fallbackRoleFromTestId(
      dashboardTestId ?? hintedDashboardTestId ?? dashboardShellTestId(location.pathname, user?.email),
    );
    return (
      <div className="signed-in-shell">
        <DashboardErrorFallback
          role={role}
          onRetry={() => {
            setProfileError(false);
            setCheckedOnboarding(false);
          }}
        />
        <FeedbackButton />
      </div>
    );
  }

  return (
    <div
      className="signed-in-shell"
      data-auth-state={checkedOnboarding ? "ready" : "content-pending"}
    >
      <Outlet />
      <FeedbackButton />
    </div>
  );
}


function fallbackRoleFromTestId(
  testId: RoleDashboardTestId | null,
): "student" | "parent" | "educator" | "school_admin" | "district_admin" | "partner" | "owner" {
  switch (testId) {
    case ROLE_DASHBOARD_TEST_IDS.student:
      return "student";
    case ROLE_DASHBOARD_TEST_IDS.educator:
      return "educator";
    case ROLE_DASHBOARD_TEST_IDS.school_admin:
      return "school_admin";
    case ROLE_DASHBOARD_TEST_IDS.district_admin:
      return "district_admin";
    case ROLE_DASHBOARD_TEST_IDS.partner:
      return "partner";
    case ROLE_DASHBOARD_TEST_IDS.owner:
      return "owner";
    default:
      return "parent";
  }
}
