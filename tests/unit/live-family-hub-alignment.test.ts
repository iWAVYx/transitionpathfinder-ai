import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildFamilyHubLiveState } from "../../src/lib/dashboard/family-live-hub";
import type { DashboardSnapshot } from "../../src/lib/golden-path.functions";

const HUB = readFileSync("src/routes/_authenticated/hubs.family.tsx", "utf8");
const OVERVIEW = readFileSync("src/components/dashboard/LiveFamilyWorkspaceOverview.tsx", "utf8");

const snapshot: DashboardSnapshot = {
  student: {
    id: "11111111-1111-4111-8111-111111111111",
    first_name: "Avery",
    last_name: "Student",
    preferred_name: null,
    grade_band: "9-10",
    school: "Example High School",
    expected_graduation_year: 2029,
    strengths_summary: "Creative problem solving",
    interests_summary: "Technology",
    support_needs_summary: null,
    family_priorities: "Build self-advocacy skills",
    current_transition_status: null,
    readiness_level: "developing",
    student_voice_statement: "I want to learn through real projects.",
  },
  latestReport: {
    id: "22222222-2222-4222-8222-222222222222",
    created_at: "2026-09-25T16:00:00.000Z",
    content: {},
  },
  goals: [],
  documents: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      title: "Sensitive IEP title must stay private",
      doc_type: "current-iep",
      status: "linked",
      created_at: "2026-09-25T16:00:00.000Z",
    },
  ],
  actionItems: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      student_id: "11111111-1111-4111-8111-111111111111",
      title: "Visit a program",
      description: null,
      category: "family",
      priority: "medium",
      status: "complete",
      due_date: null,
      related_goal_area: null,
      pathway_report_id: null,
      created_at: "2026-09-25T16:00:00.000Z",
    },
  ],
  upcomingMeeting: {
    id: "55555555-5555-4555-8555-555555555555",
    title: "Annual PPT",
    kind: "ppt",
    scheduled_at: "2026-10-15T16:00:00.000Z",
    location: "School",
  },
  meetingPrep: [],
  recommendedResources: [
    {
      id: "66666666-6666-4666-8666-666666666666",
      title: "Self-advocacy guide",
      description: null,
      resource_type: "guide",
      topic: "self-advocacy",
      url: "https://example.org/guide",
      matched_reason: "Family priority",
      saved: true,
    },
  ],
  consents: [
    {
      id: "77777777-7777-4777-8777-777777777777",
      student_id: "11111111-1111-4111-8111-111111111111",
      consent_type: "document_storage",
      consent_status: "granted",
      granted_at: "2026-09-25T16:00:00.000Z",
      revoked_at: null,
      expires_at: null,
      consent_text_snapshot: "Approved",
    },
  ],
};

describe("live Family Hub alignment", () => {
  it("loads authorized student data and removes every signed-in demo fixture", () => {
    for (const liveDependency of [
      "getDashboardSnapshot",
      "listStudents",
      "getProfile",
      "LiveFamilyWorkspaceOverview",
      "NextActionCardServer",
      "buildFamilyHubLiveState",
    ]) {
      expect(HUB).toContain(liveDependency);
    }

    expect(HUB).not.toMatch(
      /ParentOverviewGrid|DEMO_NEXT_ACTIONS|DEMO_RECENTLY_COMPLETED|demo-fixtures|useDemoStudent/,
    );
    expect(HUB).not.toContain("Plan active");
    expect(HUB).not.toContain("PPT · Sep 15");
    expect(HUB).not.toContain("1 pending");
  });

  it("derives truthful operation statuses and stage progress from the live snapshot", () => {
    const state = buildFamilyHubLiveState(snapshot);

    expect(state).not.toBeNull();
    expect(state?.operations.documents).toEqual({ status: "1 on file", tone: "success" });
    expect(state?.operations.meeting).toEqual({ status: "Oct 15", tone: "neutral" });
    expect(state?.operations.priorities).toEqual({
      status: "Priorities saved",
      tone: "success",
    });
    expect(state?.operations.consent).toEqual({ status: "1 active", tone: "success" });
    expect(state?.operations.resources).toEqual({ status: "1 matched", tone: "neutral" });
    expect([...state!.completedStages]).toEqual([
      "start",
      "voice",
      "family",
      "evidence",
      "ready",
      "roadmap",
      "action",
    ]);
    expect(state?.currentStage).toBe("connect");
  });

  it("uses honest empty states instead of inventing completion", () => {
    const emptyState = buildFamilyHubLiveState({
      ...snapshot,
      student: {
        ...snapshot.student!,
        family_priorities: null,
        readiness_level: null,
        student_voice_statement: null,
      },
      latestReport: null,
      documents: [],
      actionItems: [],
      upcomingMeeting: null,
      recommendedResources: [],
      consents: [],
    });

    expect([...emptyState!.completedStages]).toEqual(["start"]);
    expect(emptyState?.currentStage).toBe("voice");
    expect(emptyState?.operations.meeting).toEqual({ status: "Not scheduled", tone: "warn" });
    expect(emptyState?.operations.priorities).toEqual({ status: "Needs input", tone: "warn" });
  });

  it("keeps sensitive document names out of Family Hub status models and previews", () => {
    const state = buildFamilyHubLiveState(snapshot);

    expect(JSON.stringify(state)).not.toContain("Sensitive IEP title must stay private");
    expect(OVERVIEW).not.toContain("snapshot.documents[0]?.title");
    expect(OVERVIEW).toContain("Private files available in Document Hub");
  });

  it("connects real progress to the shared Stage Journey", () => {
    expect(HUB).toContain("completedStages={liveState.completedStages}");
    expect(HUB).toContain("currentStage={liveState.currentStage}");
  });
});
