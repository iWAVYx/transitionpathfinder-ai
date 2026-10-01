import { audiencesForRoles, isAllowed, type RoleAudience } from "./role-policy";

/** Curated shortcuts only: every entry must belong to an existing role dashboard
 * card (or its related actions). Route existence and role access alone are insufficient.
 * Keep discarded catalog links out until they have a useful dashboard home.
 */
type Tool = { to: string; label: string };
const tools: Partial<Record<RoleAudience, Tool[]>> = {
  family: [
    { to: "/documents", label: "IEP & Documents" },
    { to: "/ppt-prep", label: "Meeting Prep" },
    { to: "/calendar", label: "Calendar" },
    { to: "/family/action-items", label: "Family Action Items" },
    { to: "/transition-channel", label: "Transition Channel" },
  ],
  student: [
    { to: "/student-voice", label: "Student Voice" },
    { to: "/pathway/student", label: "My Pathway Report" },
    { to: "/action-items", label: "My Next Actions" },
    { to: "/calendar", label: "Calendar" },
    { to: "/resources", label: "Resources" },
    { to: "/partner-network", label: "Partner Network" },
    { to: "/transition-channel", label: "Transition Channel" },
  ],
  educator: [
    { to: "/caseload?view=students", label: "Caseload Snapshot" },
    { to: "/reports", label: "Pathway Reports" },
    { to: "/educator/document-review", label: "Document Review" },
    { to: "/ppt-prep", label: "Meeting Prep" },
    { to: "/calendar", label: "Calendar" },
    { to: "/educator/action-items", label: "Action Items" },
    { to: "/transition-channel", label: "Transition Channel" },
  ],
  school_admin: [
    { to: "/school/team", label: "Staff & Team" },
    { to: "/school/reports", label: "School Reports" },
    { to: "/school/support-needs", label: "Support Needs" },
    { to: "/school/implementation", label: "Implementation" },
    { to: "/school/calendar", label: "School Calendar" },
  ],
  district_admin: [
    { to: "/district/schools", label: "Schools" },
    { to: "/district/progress", label: "School Progress" },
    { to: "/district/reports", label: "District Reports" },
    { to: "/district/service-gaps", label: "Service Gaps" },
    { to: "/district/implementation", label: "Implementation" },
  ],
  partner: [
    { to: "/partners-manage/profile", label: "Organization Profile" },
    { to: "/partners-manage/opportunities", label: "Opportunities" },
    { to: "/partners-manage/deadlines", label: "Application Windows" },
    { to: "/partners-manage/resources", label: "Partner Resources" },
    { to: "/partnerforward/incentives", label: "Incentives & Support" },
  ],
};

export function workspaceToolGroups(roles: string[], isPlatformAdmin = false) {
  const audiences = audiencesForRoles(roles);
  const owner = isPlatformAdmin || audiences.has("admin");
  const destinations = owner
    ? [
        { to: "/owner/content", label: "Website Content" },
        { to: "/owner/blog", label: "Blog" },
        { to: "/owner/users", label: "Users & Access" },
        { to: "/owner/opportunities", label: "Opportunity Review" },
      ]
    : [...audiences].flatMap((role) => tools[role] ?? []);
  const unique = destinations.filter(
    (tool, index, all) =>
      all.findIndex((candidate) => candidate.to === tool.to) === index &&
      (owner || isAllowed(tool.to.split("?")[0], roles)),
  );
  return [
    { label: owner ? "Website management" : "Tools", items: unique },
    {
      label: "Account",
      items: [
        { to: "/settings", label: "Settings" },
        { to: "/help", label: "Help & Support" },
      ],
    },
  ].filter((group) => group.items.length > 0);
}
