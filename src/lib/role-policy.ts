// Single source of truth for role → workspace visibility.
// Used by SiteHeader (to hide nav) and RoleGuard (to redirect deep-links).

export type RoleAudience = "parent" | "teacher" | "admin" | "partner";

export function audiencesForRoles(roles: string[]): Set<RoleAudience> {
  const out = new Set<RoleAudience>();
  for (const r of roles) {
    switch (r) {
      case "parent":
      case "guardian":
      case "student":
        out.add("parent");
        break;
      case "teacher":
      case "educator":
      case "case_manager":
        out.add("teacher");
        break;
      case "school_admin":
      case "administrator":
      case "admin":
        out.add("admin");
        out.add("teacher");
        break;
      case "partner":
        out.add("partner");
        break;
    }
  }
  if (out.size === 0) out.add("parent");
  return out;
}

// Path → audiences that may access it. Anything not listed is open to every
// signed-in user.
export const ROUTE_AUDIENCES: Record<string, RoleAudience[]> = {
  "/students": ["parent", "teacher", "admin"],
  "/goals": ["parent", "teacher", "admin"],
  "/documents": ["parent", "teacher", "admin"],
  "/pathway": ["parent", "teacher", "admin"],
  "/reports": ["parent", "teacher", "admin"],
  "/ppt-prep": ["parent", "teacher", "admin"],
  "/meetings": ["parent", "teacher", "admin"],
  "/insights": ["teacher", "admin"],
  "/analytics": ["teacher", "admin"],
  "/admin": ["admin"],
  "/admin-school": ["admin"],
  "/partners-manage": ["admin", "partner"],
};

export function isAllowed(path: string, roles: string[]): boolean {
  const required = ROUTE_AUDIENCES[path];
  if (!required) return true;
  const have = audiencesForRoles(roles);
  return required.some((r) => have.has(r));
}

// Where to send a user who lacks access — pick their best landing page.
export function fallbackPathFor(roles: string[]): string {
  const a = audiencesForRoles(roles);
  if (a.has("admin")) return "/admin";
  if (a.has("teacher")) return "/insights";
  if (a.has("partner")) return "/partners-manage";
  return "/dashboard";
}
