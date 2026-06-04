// Single source of truth for role → workspace visibility.
// Used by SiteHeader (to hide nav) and RoleGuard (to redirect deep-links).

export type RoleAudience =
  | "student"
  | "family"
  | "educator"
  | "school_admin"
  | "admin"
  | "partner";

export function audiencesForRoles(roles: string[]): Set<RoleAudience> {
  const out = new Set<RoleAudience>();
  for (const r of roles) {
    switch (r) {
      case "student":
        out.add("student");
        break;
      case "parent":
      case "guardian":
        out.add("family");
        break;
      case "teacher":
      case "educator":
      case "case_manager":
        out.add("educator");
        break;
      case "school_admin":
        out.add("school_admin");
        break;
      case "admin":
        out.add("admin");
        break;
      case "partner":
        out.add("partner");
        break;
      // unknown / "other" / "administrator" UI label → no audience
      // forcing the user back through onboarding to re-select.
    }
  }
  return out;
}

// Path → audiences that may access it. Anything not listed is open to every
// signed-in user.
export const ROUTE_AUDIENCES: Record<string, RoleAudience[]> = {
  "/students": ["family", "educator", "admin"],
  "/caseload": ["educator", "admin"],
  "/goals": ["family", "educator", "admin"],
  "/documents": ["family", "educator", "admin"],
  "/pathway": ["family", "educator", "admin"],
  "/reports": ["family", "educator", "student", "admin"],
  "/ppt-prep": ["family", "educator", "admin"],
  "/meetings": ["family", "educator", "admin"],
  "/insights": ["educator", "school_admin", "admin"],
  "/analytics": ["educator", "school_admin", "admin"],
  "/admin": ["admin"],
  "/admin-school": ["school_admin", "admin"],
  "/partners-manage": ["partner", "admin"],
  "/school/overview": ["school_admin", "admin"],
  "/school/team": ["school_admin", "admin"],
  "/school/reports": ["school_admin", "admin"],
  "/school/implementation": ["school_admin", "admin"],
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
  if (a.has("school_admin")) return "/school/overview";
  if (a.has("educator")) return "/caseload";
  if (a.has("partner")) return "/partners-manage";
  if (a.has("family") || a.has("student")) return "/dashboard";
  return "/onboarding";
}

// Human-readable label for an audience — used in UI copy and toasts.
export const AUDIENCE_LABEL: Record<RoleAudience, string> = {
  student: "Student",
  family: "Family",
  educator: "Educator / Case Manager",
  school_admin: "School Administrator",
  admin: "Platform Admin",
  partner: "Partner Organization",
};
