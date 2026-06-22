import { redirect, isRedirect } from "@tanstack/react-router";
import { getMyRoles } from "@/lib/profile.functions";
import {
  audiencesForRoles,
  fallbackPathFor,
  type RoleAudience,
} from "@/lib/role-policy";

/**
 * Route-level role gate for use in `beforeLoad`. Runs server-side via the
 * `getMyRoles` server function and throws a redirect BEFORE the route
 * component renders, so direct-URL navigation to forbidden routes never
 * leaves the user parked on the forbidden path.
 *
 * Fails open on network errors to avoid locking users out on transient
 * failures — underlying RLS still protects data. The component-level
 * RoleGuard remains as defense-in-depth.
 */
export async function ensureRoleAccess(allow: RoleAudience[]): Promise<void> {
  try {
    const { roles } = await getMyRoles();
    const have = audiencesForRoles(roles);
    const ok = allow.some((r) => have.has(r));
    if (!ok) {
      throw redirect({ to: fallbackPathFor(roles), replace: true });
    }
  } catch (err) {
    if (isRedirect(err)) throw err;
    // transient failure — fail open
  }
}
