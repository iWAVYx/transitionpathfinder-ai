import { ROUTE_AUDIENCES, type RoleAudience } from "@/lib/role-policy";

export type PersonalActionRole = "student" | "family" | "educator" | "partner";
/** An existing registered personal tool, never an arbitrary signed-in route. */
export function personalActionDestination(
  role: PersonalActionRole,
  destination: string | null | undefined,
): string | undefined {
  if (!destination?.startsWith("/") || destination.startsWith("//") || destination.includes("\\"))
    return undefined;
  try {
    const url = new URL(destination, "https://workspace.invalid");
    if (url.origin !== "https://workspace.invalid") return undefined;
    let path = url.pathname;
    if (/^\/reports\/[A-Za-z0-9_-]+$/.test(path)) path = "/reports";
    if (/^\/meetings\/[A-Za-z0-9_-]+$/.test(path)) path = "/meetings";
    const audiences: RoleAudience[] | undefined = ROUTE_AUDIENCES[path];
    if (!audiences?.includes(role)) return undefined;
    // No arbitrary redirect/query payload is carried into a destination.
    return url.pathname + url.hash;
  } catch {
    return undefined;
  }
}
