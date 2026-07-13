import { audiencesForRoles } from "@/lib/role-policy";

/** Best dashboard path for a given set of user roles. */
export function dashboardPathForRoles(roles: string[]): string {
  const a = audiencesForRoles(roles);
  if (a.has("admin")) return "/hubs/admin";
  if (a.has("district_admin")) return "/district/overview";
  if (a.has("school_admin")) return "/school/overview";
  if (a.has("educator")) return "/caseload";
  if (a.has("partner")) return "/partners-manage";
  if (a.has("family") || a.has("student")) return "/dashboard";
  return "/dashboard";
}
