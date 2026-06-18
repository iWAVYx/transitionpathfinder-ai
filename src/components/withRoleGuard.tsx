import { RoleGuard } from "@/components/RoleGuard";
import type { RoleAudience } from "@/lib/role-policy";

/**
 * Wrap a route component with a RoleGuard. Use in `component:` of
 * createFileRoute for routes not already covered by ROUTE_AUDIENCES
 * (e.g. dynamic-segment children of guarded parents).
 */
export function withRoleGuard<P extends object>(
  allow: RoleAudience[],
  Component: React.ComponentType<P>,
  path = "__guarded__",
): React.ComponentType<P> {
  const Guarded = (props: P) => (
    <RoleGuard path={path} allow={allow}>
      <Component {...props} />
    </RoleGuard>
  );
  Guarded.displayName = `withRoleGuard(${Component.displayName ?? Component.name ?? "Component"})`;
  return Guarded;
}
