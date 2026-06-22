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