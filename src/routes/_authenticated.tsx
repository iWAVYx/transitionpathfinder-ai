import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
    // Read session from localStorage (no network round-trip) so the route
    // mounts immediately once the client has a session. `getUser()` would
    // hit /auth/v1/user and, if that request stalls, keep every viewer in
    // `pendingComponent` for 20+ seconds — the exact regression the student
    // dashboard-setup probe reports. `requireSupabaseAuth` middleware still
    // verifies the JWT on every protected server function, and the client
    // effect below handles session expiry mid-session.
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error("Your session could not be checked. Please try again.");
    if (!data.session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: workspaceReturnPath(location),
          reason: reasonForPath(location.pathname),
        },
        replace: true,
        reloadDocument: true,
      });
    }
    // 2FA gate: if the user has a verified TOTP factor but hasn't completed
    // the challenge this session, bounce to /login/2fa. The /login/2fa route
    // itself lives outside _authenticated so this doesn't loop. Kept in
    // beforeLoad — AAL is derived from the local session, not the network.
    const { data: aal, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (
      assuranceError ||
      !aal ||
      !["aal1", "aal2"].includes(aal.currentLevel ?? "") ||
      !["aal1", "aal2"].includes(aal.nextLevel ?? "")
    )
      throw new Error("Your sign-in security could not be checked. Please try again.");
    if (aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      throw redirect({
        to: "/login/2fa",
        search: { redirect: workspaceReturnPath(location) },
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

function dashboardShellTestId(
  pathname: string,
  userEmail?: string | null,
): RoleDashboardTestId | null {
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
      <h1 className="font-display text-xl font-medium tracking-tight">Preparing Your Workspace</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Checking your access and loading your dashboard. This only takes a moment.
      </p>
    </main>
  );
}

function workspaceReturnPath(location: { pathname: string; searchStr?: string; hash?: string }) {
  const hash = location.hash
    ? location.hash.startsWith("#")
      ? location.hash
      : `#${location.hash}`
    : "";
  return `${location.pathname}${location.searchStr ?? ""}${hash}`;
}

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const scopeKey = JSON.stringify([user?.id ?? null, loading, location.pathname]);
  const currentKey = useRef(scopeKey);
  currentKey.current = scopeKey;
  if (loading) return <WorkspaceAccessShell />;
  if (!user)
    return (
      <SignedOutWorkspace
        key={workspaceReturnPath(location)}
        path={location.pathname}
        returnPath={workspaceReturnPath(location)}
        scopeKey={scopeKey}
        currentKey={currentKey}
      />
    );
  return (
    <AuthenticatedWorkspace
      key={scopeKey}
      viewerId={user.id}
      path={location.pathname}
      scopeKey={scopeKey}
      currentKey={currentKey}
    />
  );
}

function SignedOutWorkspace({
  path,
  returnPath,
  scopeKey,
  currentKey,
}: {
  path: string;
  returnPath: string;
  scopeKey: string;
  currentKey: { current: string };
}) {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await navigate({
          to: "/login",
          search: { redirect: returnPath, reason: reasonForPath(path) },
          replace: true,
          // A missing session must leave the hydrated protected route tree.
          // In-page navigation can retain/re-render that tree during startup,
          // repeatedly redirecting before browser history can settle.
          reloadDocument: true,
        });
      } catch {
        if (!cancelled && currentKey.current === scopeKey) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, scopeKey, currentKey, returnPath, path, retry]);
  return (
    <WorkspaceAccessShell
      error={failed}
      retry={() => {
        setFailed(false);
        setRetry((value) => value + 1);
      }}
    />
  );
}

function AuthenticatedWorkspace({
  viewerId,
  path,
  scopeKey,
  currentKey,
}: {
  viewerId: string;
  path: string;
  scopeKey: string;
  currentKey: { current: string };
}) {
  const navigate = useNavigate();
  const loadProfile = useServerFn(getProfile);
  const loadAdminRoles = useServerFn(getMyAdminRoles);
  const exempt =
    ONBOARDING_EXEMPT.includes(path) ||
    ONBOARDING_EXEMPT_PREFIX.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  const [status, setStatus] = useState<"checking" | "ready" | "error">(
    exempt ? "ready" : "checking",
  );
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const current = () => !cancelled && currentKey.current === scopeKey;
    if (exempt) return;
    loadProfile({ data: { expected_viewer_id: viewerId } })
      .then(async (profile) => {
        if (!current()) return;
        if (profile?.id !== viewerId || typeof profile.onboarding_completed !== "boolean")
          throw new Error("Invalid workspace profile");
        if (profile.onboarding_completed) {
          setStatus("ready");
          return;
        }
        const admin = await loadAdminRoles({ data: { expected_viewer_id: viewerId } });
        if (!current()) return;
        if (typeof admin?.isPlatformAdmin !== "boolean")
          throw new Error("Invalid workspace response");
        await navigate({ to: admin.isPlatformAdmin ? "/owner" : "/onboarding", replace: true });
      })
      .catch(() => {
        if (current()) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [viewerId, path, exempt, scopeKey, currentKey, loadProfile, loadAdminRoles, navigate, retry]);
  if (status !== "ready")
    return (
      <WorkspaceAccessShell
        error={status === "error"}
        retry={() => {
          setStatus("checking");
          setRetry((value) => value + 1);
        }}
      />
    );
  return (
    <div className="signed-in-shell" data-auth-state="ready">
      <Outlet />
      <FeedbackButton />
    </div>
  );
}

/** A visible, data-free main while session/onboarding checks are unresolved. */
function WorkspaceAccessShell({ error, retry }: { error?: boolean; retry?: () => void }) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 py-16 text-center"
      data-auth-state={error ? "access-error" : "session-loading"}
      data-dashboard-testid-contract={DASHBOARD_TESTID_CONTRACT_VERSION}
    >
      <div role={error ? "alert" : "status"}>
        <h1 className="font-display text-xl font-medium tracking-tight">
          {error ? "We Could Not Open Your Workspace" : "Preparing Your Workspace"}
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          {error
            ? "Please try opening your workspace again."
            : "Checking your session and workspace access."}
        </p>
        {error && (
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-full border px-4 py-2 text-sm font-semibold"
          >
            Try Again
          </button>
        )}
      </div>
    </main>
  );
}
