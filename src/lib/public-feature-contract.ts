export type PublicFeatureStatus = "available" | "pilot" | "partial";

export type PublicFeatureAudience = "Family" | "Student" | "Educator" | "Admin";

export type PublicFeatureRoute =
  | "/demo/documents"
  | "/demo/educator"
  | "/demo/family"
  | "/demo/intake"
  | "/demo/meeting"
  | "/demo/opportunities"
  | "/demo/plan"
  | "/demo/report"
  | "/demo/transition-channel"
  | "/demo/voice"
  | "/caseload"
  | "/dashboard"
  | "/documents"
  | "/family/history"
  | "/family/priorities"
  | "/goals"
  | "/pathway"
  | "/ppt-prep"
  | "/reports"
  | "/resources"
  | "/student-voice"
  | "/transition-channel";

export interface PublicFeatureContract {
  id: string;
  status: PublicFeatureStatus;
  statusLabel: string;
  previewRoute: PublicFeatureRoute;
  liveRoute: PublicFeatureRoute;
  liveAudiences: readonly PublicFeatureAudience[];
  availability: string;
}

/**
 * One source of truth for promises made on the public website.
 *
 * A feature may be advertised only when it has both a public guided preview
 * and a real signed-in destination. `partial` and `pilot` entries deliberately
 * describe the current boundary so marketing copy cannot silently outrun the
 * product.
 */
export const PUBLIC_FEATURES = {
  "family-dashboard": {
    id: "family-dashboard",
    status: "available",
    statusLabel: "Available now",
    previewRoute: "/demo/family",
    liveRoute: "/dashboard",
    liveAudiences: ["Family"],
    availability:
      "The family dashboard is available to connected family accounts; deeper dashboard/data parity is still being expanded.",
  },
  "pathway-builder": {
    id: "pathway-builder",
    status: "available",
    statusLabel: "Available now",
    previewRoute: "/demo/intake",
    liveRoute: "/pathway",
    liveAudiences: ["Family", "Educator", "Admin"],
    availability:
      "The guided preview is public. Live intake is available to authorized family, educator, and administrator accounts.",
  },
  "student-voice": {
    id: "student-voice",
    status: "available",
    statusLabel: "Available now",
    previewRoute: "/demo/voice",
    liveRoute: "/student-voice",
    liveAudiences: ["Family", "Student", "Educator", "Admin"],
    availability:
      "Students and their connected teams can capture strengths, preferences, and meeting input.",
  },
  "family-voice": {
    id: "family-voice",
    status: "available",
    statusLabel: "Available now",
    previewRoute: "/demo/family",
    liveRoute: "/family/priorities",
    liveAudiences: ["Family", "Educator", "Admin"],
    availability:
      "Connected family accounts can save priorities, concerns, and questions for the student team.",
  },
  "family-translator": {
    id: "family-translator",
    status: "partial",
    statusLabel: "Partially available",
    previewRoute: "/demo/report",
    liveRoute: "/reports",
    liveAudiences: ["Family", "Student", "Educator", "Admin"],
    availability:
      "Plain-language explanations are included in Pathway Reports. A standalone paste-and-translate tool is not yet available.",
  },
  "goal-progress": {
    id: "goal-progress",
    status: "partial",
    statusLabel: "Partially available",
    previewRoute: "/demo/plan",
    liveRoute: "/goals",
    liveAudiences: ["Family", "Educator", "Admin"],
    availability:
      "Goal status tracking is live. Evidence journals, charts, compliance views, and exports are still being built.",
  },
  "assessment-vault": {
    id: "assessment-vault",
    status: "pilot",
    statusLabel: "Protected pilot",
    previewRoute: "/demo/documents",
    liveRoute: "/documents",
    liveAudiences: ["Family", "Educator", "Admin"],
    availability:
      "Privacy-reviewed TXT and text-based PDF uploads are being validated in staging. Scans, images, and Word files are not yet supported.",
  },
  "ppt-prep": {
    id: "ppt-prep",
    status: "available",
    statusLabel: "Available now",
    previewRoute: "/demo/meeting",
    liveRoute: "/ppt-prep",
    liveAudiences: ["Family", "Educator", "Admin"],
    availability:
      "Meeting-prep generation, saved plans, scripts, questions, and print/PDF output are available to authorized family and educator accounts.",
  },
  "resource-match": {
    id: "resource-match",
    status: "partial",
    statusLabel: "Partially available",
    previewRoute: "/demo/opportunities",
    liveRoute: "/resources",
    liveAudiences: ["Family", "Student", "Educator", "Admin"],
    availability:
      "Searchable resources and partner listings are live. Student-specific matching and warm handoffs are still being completed.",
  },
  "educator-dashboard": {
    id: "educator-dashboard",
    status: "available",
    statusLabel: "Available now",
    previewRoute: "/demo/educator",
    liveRoute: "/caseload",
    liveAudiences: ["Educator", "Admin"],
    availability:
      "Licensed educators can open their caseload and student records; fixture-driven supporting views are being replaced with live data.",
  },
  "communication-log": {
    id: "communication-log",
    status: "partial",
    statusLabel: "Partially available",
    previewRoute: "/demo/transition-channel",
    liveRoute: "/transition-channel",
    liveAudiences: ["Family", "Student", "Educator", "Admin"],
    availability:
      "Secure messaging and case notes are available. A unified, exportable family-communication log is still being completed.",
  },
  "report-export": {
    id: "report-export",
    status: "available",
    statusLabel: "Available now",
    previewRoute: "/demo/report",
    liveRoute: "/reports",
    liveAudiences: ["Family", "Student", "Educator", "Admin"],
    availability: "Authorized users can open Pathway Reports and use their print/PDF output.",
  },
  "document-history": {
    id: "document-history",
    status: "partial",
    statusLabel: "Partially available",
    previewRoute: "/demo/documents",
    liveRoute: "/family/history",
    liveAudiences: ["Family", "Admin"],
    availability:
      "Family history and document views exist; the complete year-over-year assessment and work-sample vault is still being built.",
  },
} as const satisfies Record<string, PublicFeatureContract>;

export type PublicFeatureId = keyof typeof PUBLIC_FEATURES;

export function getPublicFeature(id: PublicFeatureId): PublicFeatureContract {
  return PUBLIC_FEATURES[id];
}
