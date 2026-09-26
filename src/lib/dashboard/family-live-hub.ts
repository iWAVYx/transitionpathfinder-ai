import type { DashboardRow } from "@/components/dashboard/DashboardRowList";
import type { DashboardSnapshot } from "@/lib/golden-path.functions";
import { stagesForAudience, type StageId } from "@/lib/workspace/stages";

type LiveStatus = Pick<DashboardRow, "status" | "tone">;

export interface FamilyHubLiveState {
  completedStages: ReadonlySet<StageId>;
  currentStage: StageId;
  operations: {
    documents: LiveStatus;
    meeting: LiveStatus;
    priorities: LiveStatus;
    consent: LiveStatus;
    resources: LiveStatus;
  };
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function formatMeetingStatus(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function isActiveConsent(consent: DashboardSnapshot["consents"][number]) {
  if (consent.consent_status !== "granted" || consent.revoked_at) return false;
  if (!consent.expires_at) return true;
  const expiresAt = new Date(consent.expires_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

/**
 * Converts one authorized dashboard snapshot into the small, non-sensitive
 * status values used by the Family Hub. The helper intentionally returns
 * counts and workflow state only; document titles, report text, messages,
 * invite addresses, and other private record contents never enter this model.
 */
export function buildFamilyHubLiveState(snapshot: DashboardSnapshot): FamilyHubLiveState | null {
  const student = snapshot.student;
  if (!student) return null;

  const completedStages = new Set<StageId>(["start"]);

  if (hasText(student.student_voice_statement)) completedStages.add("voice");
  if (hasText(student.family_priorities)) completedStages.add("family");
  if (snapshot.documents.length > 0) completedStages.add("evidence");
  if (hasText(student.readiness_level)) completedStages.add("ready");
  if (snapshot.latestReport) completedStages.add("roadmap");
  if (snapshot.actionItems.some((item) => item.status === "complete")) {
    completedStages.add("action");
  }
  const familyStages = stagesForAudience("family");
  const currentStage =
    familyStages.find((stage) => !completedStages.has(stage.id))?.id ??
    familyStages.at(-1)?.id ??
    "start";
  const activeConsents = snapshot.consents.filter(isActiveConsent).length;
  const documentCount = snapshot.documents.length;
  const resourceCount = snapshot.recommendedResources.length;

  return {
    completedStages,
    currentStage,
    operations: {
      documents: {
        status: `${documentCount} on file`,
        tone: documentCount > 0 ? "success" : "warn",
      },
      meeting: {
        status: formatMeetingStatus(snapshot.upcomingMeeting?.scheduled_at),
        tone: snapshot.upcomingMeeting ? "neutral" : "warn",
      },
      priorities: {
        status: hasText(student.family_priorities) ? "Priorities saved" : "Needs input",
        tone: hasText(student.family_priorities) ? "success" : "warn",
      },
      consent: {
        status: `${activeConsents} active`,
        tone: activeConsents > 0 ? "success" : "neutral",
      },
      resources: {
        status: `${resourceCount} matched`,
        tone: "neutral",
      },
    },
  };
}
