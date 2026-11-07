import { redirect, isRedirect } from "@tanstack/react-router";
import { getMyRoles } from "@/lib/profile.functions";
import { audiencesForRoles, fallbackPathFor, type RoleAudience } from "@/lib/role-policy";

/**
 * Route-level role gate for use in `beforeLoad`. Runs server-side via the
 * `getMyRoles` server function and throws a redirect BEFORE the route
 * component renders, so direct-URL navigation to forbidden routes never
 * leaves the user parked on the forbidden path.
 *
 * Failed reads reach the existing route error/retry boundary. They never
 * authorize rendering. Server authorization and RLS still enforce record access.
 */
export async function ensureRoleAccess(allow: RoleAudience[]): Promise<void> {
  try {
    const { roles } = await getMyRoles();
    if (!Array.isArray(roles) || roles.some((role) => typeof role !== "string"))
      throw new Error("Invalid access response");
    const have = audiencesForRoles(roles);
    const ok = allow.some((r) => have.has(r));
    if (!ok) {
      throw redirect({ to: have.has("admin") ? "/owner" : fallbackPathFor(roles), replace: true });
    }
  } catch (err) {
    if (isRedirect(err)) throw err;
    throw new Error("Your workspace access could not be checked. Please try again.");
  }
}
