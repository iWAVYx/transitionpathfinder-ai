import type { SchoolProfile, DistrictProfile } from "./role-contexts";

export function schoolWidgetActions(school: SchoolProfile) {
  return [
    {
      id: "school-reports",
      title: "Review Pathway Report Completion",
      detail: `${school.shortName}: ${school.reportsComplete} of ${school.iepCaseload} reports complete (${school.completionPct}%).`,
      to: "/demo/feature/school-admin/report-completion",
    },
    {
      id: "school-team",
      title: "Review Team Access",
      detail:
        school.onboardingNeeded > 0
          ? `${school.onboardingNeeded} staff members need onboarding in this sample school.`
          : "Sample staff onboarding is complete. Review the team's access.",
      to: "/demo/feature/school-admin/team-access",
    },
    {
      id: "school-readiness",
      title: "Review School Readiness",
      detail: `Sample support focus: ${school.topSupportGap}.`,
      to: "/demo/feature/school-admin/readiness-trends",
    },
  ];
}

export function districtWidgetActions(district: DistrictProfile) {
  const pending = district.schools - district.schoolsConnected;
  return [
    {
      id: "district-rollout",
      title: "Review District Implementation",
      detail: `${district.shortName}: ${district.schoolsConnected} of ${district.schools} schools connected. ${pending > 0 ? `${pending} pending connection.` : "All sample schools are connected."}`,
      to: "/demo/feature/district-admin/implementation",
    },
    {
      id: "district-reports",
      title: "Review District Reports",
      detail: `${district.reportsComplete} completed reports across ${district.iepPopulation} students in this sample district.`,
      to: "/demo/feature/district-admin/district-reports",
    },
    {
      id: "district-readiness",
      title: "Review District Readiness",
      detail: `Sample readiness: ${district.readinessBand}. Support focus: ${district.serviceGap}.`,
      to: "/demo/feature/district-admin/readiness-trend",
    },
  ];
}
