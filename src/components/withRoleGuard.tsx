import { useLocation } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import type { RoleAudience } from "@/lib/role-policy";
import { dashboardTestIdForPath } from "@/lib/dashboard-testids";

/**
 * Wrap a route component with a RoleGuard. Use in `component:` of
 * createFileRoute for routes not already covered by ROUTE_AUDIENCES
 * (e.g. dynamic-segment children of guarded parents).
 */
export function withRoleGuard(
  allow: RoleAudience[],
  Component: () => React.ReactNode,
  path = "__guarded__",
): () => React.ReactElement {
  const Guarded = () => {
    const location = useLocation();
    const guardPath = path === "__guarded__" ? location.pathname : path;
    return (
      <RoleGuard path={guardPath} allow={allow} fallback={<GuardFallback path={guardPath} />}>
        <Component />
      </RoleGuard>
    );
  };
  Guarded.displayName = `withRoleGuard(${(Component as { displayName?: string; name?: string }).displayName ?? Component.name ?? "Component"})`;
  return Guarded;
}

function GuardFallback({ path }: { path: string }) {
  const testId = dashboardTestIdForPath(path);
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background"
      data-testid={testId ?? undefined}
    >
      <p className="text-sm text-muted-foreground">Checking access…</p>
    </main>
  );
}
