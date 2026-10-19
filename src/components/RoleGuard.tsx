import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MainLandmarkContext } from "@/components/site/main-landmark-context";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getMyRoles } from "@/lib/profile.functions";
import {
  DASHBOARD_TESTID_CONTRACT_VERSION,
  dashboardTestIdForPath,
  dashboardTestIdForDashboardHint,
} from "@/lib/dashboard-testids";
import {
  ROUTE_AUDIENCES,
  audiencesForRoles,
  fallbackPathFor,
  labelForAudiences,
  labelForDestination,
  type RoleAudience,
} from "@/lib/role-policy";

type Props = {
  path: keyof typeof ROUTE_AUDIENCES | string;
  allow?: RoleAudience[];
  /** A data-free route shell that preserves its loading landmark. */
  fallback?: ReactNode;
  /** @deprecated Use fallback for a persistent shell. Protected children always wait for access. */
  keepMounted?: boolean;
  children: ReactNode;
};

/** UI eligibility only; server authorization and RLS remain authoritative. */
export function RoleGuard(props: Props) {
  const { user, loading } = useAuth();
  const required = props.allow ?? ROUTE_AUDIENCES[props.path];
  // Equivalent inline arrays must not start another check on each render.
  const policyKey =
    required === undefined ? "unlisted" : JSON.stringify([...new Set(required)].sort());
  const scopeKey = JSON.stringify([user?.id ?? null, loading, props.path, policyKey]);
  const currentKey = useRef(scopeKey);
  currentKey.current = scopeKey;
  if (loading)
    return <>{props.fallback ?? <AccessFrame path={props.path} email={user?.email} />}</>;
  if (!user) return <AccessFrame path={props.path} signedOut />;
  return (
    <RoleGuardSession
      key={scopeKey}
      {...props}
      viewerId={user.id}
      email={user.email}
      policyKey={policyKey}
      scopeKey={scopeKey}
      currentKey={currentKey}
    />
  );
}

function RoleGuardSession({
  path,
  fallback,
  children,
  viewerId,
  email,
  policyKey,
  scopeKey,
  currentKey,
}: Props & {
  viewerId: string;
  email?: string;
  policyKey: string;
  scopeKey: string;
  currentKey: { current: string };
}) {
  const navigate = useNavigate();
  const fetchRoles = useServerFn(getMyRoles);
  const [status, setStatus] = useState<"checking" | "allowed" | "denied" | "error">("checking");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const current = () => !cancelled && currentKey.current === scopeKey;
    fetchRoles({ data: { expected_viewer_id: viewerId } })
      .then(async ({ roles }) => {
        if (!current()) return;
        if (!Array.isArray(roles) || roles.some((role) => typeof role !== "string"))
          throw new Error("Invalid access response");
        const required: RoleAudience[] | undefined =
          policyKey === "unlisted" ? undefined : JSON.parse(policyKey);
        const have = audiencesForRoles(roles);
        if (!required || required.some((role) => have.has(role))) {
          setStatus("allowed");
          return;
        }
        setStatus("denied");
        const target = have.has("admin") ? "/owner" : fallbackPathFor(roles);
        toast.error(`That page is for ${labelForAudiences(required)}.`, {
          description: `Taking you to ${labelForDestination(target)} instead.`,
        });
        await navigate({ to: target, replace: true });
      })
      .catch(() => {
        if (current()) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchRoles, navigate, policyKey, viewerId, scopeKey, currentKey, retry]);

  if (status === "allowed") return <>{children}</>;
  if (status === "error")
    return (
      <AccessFrame
        path={path}
        email={email}
        onRetry={() => {
          setStatus("checking");
          setRetry((value) => value + 1);
        }}
      />
    );
  return <>{fallback ?? <AccessFrame path={path} email={email} />}</>;
}

function AccessFrame({
  path,
  email,
  signedOut,
  onRetry,
}: {
  path: string;
  email?: string;
  signedOut?: boolean;
  onRetry?: () => void;
}) {
  const insideMain = useContext(MainLandmarkContext);
  const Container = insideMain ? "div" : "main";
  const hint =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("dashboardTestId") ||
        window.localStorage.getItem("tf:e2e-dashboard-testid");
  const returnPath =
    typeof window !== "undefined" && window.location.pathname === path
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : path;
  const testId =
    dashboardTestIdForPath(path) ??
    dashboardTestIdForDashboardHint(hint) ??
    dashboardTestIdForDashboardHint(email);
  return (
    <Container
      data-testid={insideMain ? undefined : testId ?? undefined}
      data-dashboard-testid-contract={DASHBOARD_TESTID_CONTRACT_VERSION}
      className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-12"
    >
      <div className="text-center" role={onRetry ? "alert" : "status"}>
        <h1 className="font-display text-2xl">
          {signedOut
            ? "Sign In to Continue"
            : onRetry
              ? "We Could Not Open This Workspace"
              : "Checking Your Workspace Access"}
        </h1>
        {onRetry && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Please try opening this page again.
            </p>
            <button
              type="button"
              className="mt-4 rounded-full border px-4 py-2 text-sm font-semibold"
              onClick={onRetry}
            >
              Try Again
            </button>
          </>
        )}
        {signedOut && (
          <Link
            to="/login"
            search={{ redirect: returnPath }}
            className="mt-4 inline-block underline"
          >
            Sign In
          </Link>
        )}
      </div>
    </Container>
  );
}
