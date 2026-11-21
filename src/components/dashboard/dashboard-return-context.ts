import { createContext } from "react";

/** SiteShell owns the role-aware return link; standalone shells keep their own. */
export const DashboardReturnContext = createContext(false);

export function isDashboardHomeDestination(to: string): boolean {
  return ["/dashboard", "/caseload", "/school/overview", "/district/overview", "/partners-manage", "/owner"].includes(to);
}
