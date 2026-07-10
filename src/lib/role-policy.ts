// Single source of truth for role → workspace visibility.
// Used by SiteHeader (to hide nav) and RoleGuard (to redirect deep-links).

export type RoleAudience =
  | "student"
  | "family"
  | "educator"
  | "school_admin"
  | "district_admin"
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
      case "district_admin":
        out.add("district_admin");
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
  "/teacher-portal": ["educator", "admin"],
  "/goals": ["family", "educator", "admin"],
  "/documents": ["family", "educator", "admin"],
  "/pathway": ["family", "educator", "admin"],
  "/reports": ["family", "educator", "student", "admin"],
  "/action-items": ["family", "educator", "student", "admin"],
  "/pathway/student": ["student", "family", "educator", "admin"],
  "/pathway/family": ["family", "educator", "admin"],
  "/family/priorities": ["family", "educator", "admin"],
  "/family/action-items": ["family", "educator", "admin"],
  "/family/consent": ["family", "admin"],
  "/educator/readiness-gaps": ["educator", "admin"],
  "/educator/notes": ["educator", "admin"],
  "/educator/action-items": ["educator", "admin"],
  "/ppt-prep": ["family", "educator", "admin"],
  "/meetings": ["family", "educator", "admin"],
  "/meeting-templates": ["educator", "admin"],
  "/insights": ["educator", "school_admin", "district_admin", "admin"],
  "/analytics": ["educator", "school_admin", "district_admin", "admin"],
  "/admin": ["admin"],
  // /admin-school is a legacy redirect to /school/overview — no guard needed

  "/partners-manage": ["partner", "admin"],
  "/partners-manage/impact": ["partner", "admin"],
  "/partners-manage/profile": ["partner", "admin"],
  "/partners-manage/opportunities": ["partner", "admin"],
  "/partners-manage/deadlines": ["partner", "admin"],


  "/school/overview": ["school_admin", "admin"],
  "/school/team": ["school_admin", "admin"],
  "/school/reports": ["school_admin", "admin"],
  "/school/implementation": ["school_admin", "admin"],
  "/school/support-needs": ["school_admin", "admin"],
  "/school/planning-status": ["school_admin", "admin"],
  "/school/readiness-trends": ["school_admin", "admin"],
  "/school/resource-usage": ["school_admin", "admin"],


  // District-level workspace — separate from school and from Platform Admin.
  "/district/overview": ["district_admin", "admin"],
  "/district/schools": ["district_admin", "admin"],
  "/district/team": ["district_admin", "admin"],
  "/district/reports": ["district_admin", "admin"],
  "/district/progress": ["district_admin", "admin"],
  "/district/implementation": ["district_admin", "admin"],
  "/district/service-gaps": ["district_admin", "admin"],
  "/district/readiness-trends": ["district_admin", "admin"],


  // Student/family workspace utilities — partner workspace excluded.
  "/feed": ["family", "educator", "student", "admin"],
  "/messages": ["family", "educator", "student", "admin"],
  "/student-voice": ["family", "educator", "student", "admin"],
  // BridgeForward dashboard tools — middle-school audiences only.
  // The /bridgeforward landing page is PUBLIC (no guard).
  "/bridgeforward": ["family", "educator", "student", "admin"],
  "/bridgeforward/intake": ["family", "educator", "student", "admin"],
  "/bridgeforward/voice": ["family", "educator", "student", "admin"],
  "/bridgeforward/fit-finder": ["family", "educator", "student", "admin"],
  "/bridgeforward/snapshot": ["family", "educator", "student", "admin"],
  "/forms": ["family", "educator", "student", "admin"],
  // Partners may browse the opportunity catalog they contribute to.
  "/opportunities": ["family", "educator", "student", "admin", "partner"],
  // Consent / privacy info — every workspace audience except partner.
  "/trust": ["family", "educator", "student", "school_admin", "district_admin", "admin"],
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
  if (a.has("district_admin")) return "/district/overview";
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
  district_admin: "School District Administrator",
  admin: "Platform Admin",
  partner: "Partner Organization",
};

// Human-readable label for a destination path — used in redirect toasts.
export const DESTINATION_LABEL: Record<string, string> = {
  "/admin": "Admin Hub",
  "/owner": "Admin Hub",
  "/district/overview": "District Overview",
  "/school/overview": "School Overview",
  "/caseload": "My Caseload",
  "/partners-manage": "Partner Workspace",
  "/dashboard": "your Dashboard",
  "/onboarding": "Onboarding",
};

export function labelForDestination(path: string): string {
  return DESTINATION_LABEL[path] ?? path;
}

export function labelForAudiences(audiences: RoleAudience[]): string {
  const labels = audiences
    .filter((a) => a !== "admin") // skip "Platform Admin" — implied
    .map((a) => AUDIENCE_LABEL[a]);
  if (labels.length === 0) return "Platform Admins";
  if (labels.length === 1) return labels[0] + " accounts";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]} accounts`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]} accounts`;
}

