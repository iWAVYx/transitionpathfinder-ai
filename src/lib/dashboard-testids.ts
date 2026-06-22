export const ROLE_DASHBOARD_TEST_IDS = {
  student: "student-dashboard-main",
  parent: "parent-dashboard-main",
  educator: "caseload-main",
  school_admin: "school-admin-dashboard-main",
  district_admin: "district-admin-dashboard-main",
  partner: "partner-dashboard-main",
  owner: "platform-admin-main",
} as const;

export type RoleDashboardTestId =
  (typeof ROLE_DASHBOARD_TEST_IDS)[keyof typeof ROLE_DASHBOARD_TEST_IDS];

export function dashboardTestIdForPath(pathname: string): RoleDashboardTestId | null {
  if (pathname === "/caseload") return ROLE_DASHBOARD_TEST_IDS.educator;
  if (pathname === "/school/overview" || pathname.startsWith("/school/")) {
    return ROLE_DASHBOARD_TEST_IDS.school_admin;
  }
  if (pathname === "/district/overview" || pathname.startsWith("/district/")) {
    return ROLE_DASHBOARD_TEST_IDS.district_admin;
  }
  if (pathname === "/partners-manage" || pathname.startsWith("/partners-manage")) {
    return ROLE_DASHBOARD_TEST_IDS.partner;
  }
  if (pathname === "/admin" || pathname === "/owner" || pathname.startsWith("/owner/")) {
    return ROLE_DASHBOARD_TEST_IDS.owner;
  }
  return null;
}

export function dashboardTestIdForProfileRole(role: string | null | undefined): RoleDashboardTestId | null {
  if (role === "student") return ROLE_DASHBOARD_TEST_IDS.student;
  if (role === "parent" || role === "guardian") return ROLE_DASHBOARD_TEST_IDS.parent;
  if (role === "educator" || role === "teacher" || role === "case_manager") return ROLE_DASHBOARD_TEST_IDS.educator;
  if (role === "school_admin") return ROLE_DASHBOARD_TEST_IDS.school_admin;
  if (role === "district_admin") return ROLE_DASHBOARD_TEST_IDS.district_admin;
  if (role === "partner") return ROLE_DASHBOARD_TEST_IDS.partner;
  if (role === "admin") return ROLE_DASHBOARD_TEST_IDS.owner;
  return null;
}

export function dashboardTestIdForRoles(roles: string[]): RoleDashboardTestId | null {
  const roleSet = new Set(roles);
  if (roleSet.has("admin")) return ROLE_DASHBOARD_TEST_IDS.owner;
  if (roleSet.has("district_admin")) return ROLE_DASHBOARD_TEST_IDS.district_admin;
  if (roleSet.has("school_admin")) return ROLE_DASHBOARD_TEST_IDS.school_admin;
  if (roleSet.has("partner")) return ROLE_DASHBOARD_TEST_IDS.partner;
  if (roleSet.has("educator") || roleSet.has("teacher") || roleSet.has("case_manager")) {
    return ROLE_DASHBOARD_TEST_IDS.educator;
  }
  if (roleSet.has("student") && !roleSet.has("parent") && !roleSet.has("guardian")) {
    return ROLE_DASHBOARD_TEST_IDS.student;
  }
  if (roleSet.has("parent") || roleSet.has("guardian")) return ROLE_DASHBOARD_TEST_IDS.parent;
  return null;
}