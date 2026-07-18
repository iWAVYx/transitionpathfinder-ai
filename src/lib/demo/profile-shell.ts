/**
 * Helpers that derive role-preview shell content from the currently
 * selected demo profile. These do NOT change the shell layout or the
 * number of tiles — they only swap the values inside the existing
 * 4-tile dashboard strip and the "shared demo student" aside.
 */

import type { DemoProfile, DemoPathwayGoal } from "@/lib/demo/demo-profiles";
import type { DashboardTile, DemoRolePreview } from "@/lib/demo/role-previews";

export type SharedStudentBlock = {
  name: string;
  pronouns: string;
  grade: string;
  school: string;
  quote: string;
};

export function sharedStudentFromProfile(profile: DemoProfile): SharedStudentBlock {
  return {
    name: profile.displayName,
    pronouns: profile.demographics.pronouns
      .split("/")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("/"),
    grade: String(profile.demographics.gradeNumber),
    school: profile.demographics.schoolPlaceholder,
    quote: profile.voice[0]?.answer ?? "",
  };
}

const READINESS_STAGE: Record<DemoProfile["readiness"]["overall"], number> = {
  emerging: 2,
  developing: 4,
  progressing: 6,
  approaching_independence: 8,
};

function nextGoalTitle(goals: DemoPathwayGoal[]): string {
  const g = goals.find((x) => x.status === "in_progress") ?? goals[0];
  return g?.title ?? "Next step";
}

function focusLabel(profile: DemoProfile): string {
  if (profile.product === "bridgeforward") {
    return "High School Discovery And Readiness";
  }
  if (profile.demographics.gradeNumber <= 9) {
    return "Foundation And Exploration";
  }
  return "Postsecondary Pathway And Next Steps";
}

export function profileFocusLabel(profile: DemoProfile): string {
  return focusLabel(profile);
}

/**
 * Overrides for the role dashboard strip. Same tile labels, values
 * computed from the selected profile so switching students changes
 * every visible metric in the shell.
 */
export function tilesForProfile(
  role: DemoRolePreview,
  profile: DemoProfile,
): DashboardTile[] {
  const stage = READINESS_STAGE[profile.readiness.overall];
  const evidence = profile.evidence.length;
  const voice = `${profile.voice.length} of 5 shared`;
  const goalsInProgress = profile.goals.filter((g) => g.status === "in_progress").length;

  switch (role.id) {
    case "student":
      return [
        {
          label: "My Pathway",
          value: `Stage ${stage} of 9`,
          hint: `Readiness · ${profile.readiness.overall.replace("_", " ")}`,
        },
        { label: "Student Voice", value: voice, hint: focusLabel(profile) },
        {
          label: "Action items",
          value: `${goalsInProgress} in progress`,
          hint: nextGoalTitle(profile.goals),
        },
        {
          label: "Focus",
          value: profile.stage.focusHeadline.split(",")[0],
          hint: `${profile.demographics.gradeLabel}`,
        },
      ];
    case "family":
      return [
        {
          label: "Connected student",
          value: profile.displayName,
          hint: `${profile.demographics.gradeLabel} · ${profile.demographics.schoolPlaceholder}`,
        },
        {
          label: "Pathway Report",
          value: "Ready to review",
          hint: `${focusLabel(profile)}`,
        },
        {
          label: "Documents",
          value: `${evidence} on file`,
          hint: profile.evidence[0]?.title ?? "IEP",
        },
        {
          label: "Family focus",
          value: profile.stage.focusHeadline.split(",")[0],
          hint: profile.family.keyConsiderations[0] ?? "",
        },
      ];
    case "educator":
      return [
        {
          label: "Featured student",
          value: profile.displayName,
          hint: `${profile.demographics.gradeLabel} · ${focusLabel(profile)}`,
        },
        {
          label: "Report status",
          value: profile.readiness.overall === "approaching_independence" ? "Ready" : "In progress",
          hint: `Readiness · ${profile.readiness.overall.replace("_", " ")}`,
        },
        {
          label: "Evidence on file",
          value: `${evidence} items`,
          hint: profile.evidence[0]?.title ?? "IEP",
        },
        {
          label: "Focus area",
          value: profile.stage.focusHeadline.split(",")[0],
          hint: `${profile.goals.length} goals tracked`,
        },
      ];
    default:
      // school-admin / district-admin / partner get their tiles from the
      // role-context hooks in RolePreviewShell, not from this helper.
      return role.dashboardTiles;
  }
}

export function headlineForProfile(role: DemoRolePreview, profile: DemoProfile): string {
  if (!role.sharedStudent) return role.headline;
  return `${role.headline.replace(/\.$/, "")} — ${profile.shortName}, ${profile.demographics.gradeLabel}.`;
}

export function introForProfile(role: DemoRolePreview, profile: DemoProfile): string {
  if (!role.sharedStudent) return role.intro;
  return `${role.intro} You're viewing ${profile.displayName}'s journey — ${focusLabel(profile).toLowerCase()}. Switch students from the header to see how the plan changes with age and goals.`;
}
