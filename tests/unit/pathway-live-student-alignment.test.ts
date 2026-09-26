import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { DashboardSnapshot } from "../../src/lib/golden-path.functions";
import {
  PATHWAY_STRUCTURED_DETAIL_FIELDS,
  PathwayIntakeFormSchema,
  buildPathwayStudentPrefill,
  createPathwayIntakeDefaults,
  mergePathwayIntake,
} from "../../src/lib/pathway-intake";

const ROUTE = readFileSync("src/routes/_authenticated/pathway.tsx", "utf8");
const SERVER = readFileSync("src/lib/pathway.functions.ts", "utf8");
const IEP_EXTRACT = readFileSync("src/lib/iep-extract.functions.ts", "utf8");

const snapshot: DashboardSnapshot = {
  student: {
    id: "11111111-1111-4111-8111-111111111111",
    first_name: "Jordan",
    last_name: "Student",
    preferred_name: "Jordy",
    grade_band: "6-8",
    school: "Example School",
    expected_graduation_year: 2031,
    strengths_summary: "Patient with younger students",
    interests_summary: "Cooking and animation",
    support_needs_summary: "Needs written steps for unfamiliar routines",
    family_priorities: "Safe community access and self-advocacy",
    current_transition_status: "Exploring",
    readiness_level: "developing",
    student_voice_statement: "I want to learn at a real job site.",
  },
  latestReport: null,
  goals: [],
  documents: [],
  actionItems: [],
  upcomingMeeting: null,
  meetingPrep: [],
  recommendedResources: [],
  consents: [],
};

describe("live-student Pathway intake alignment", () => {
  it("prefills a fresh intake from only the authorized dashboard snapshot", () => {
    expect(buildPathwayStudentPrefill(snapshot)).toEqual({
      student_id: "11111111-1111-4111-8111-111111111111",
      student_first_name: "Jordy",
      grade_band: "6-8",
      strengths: "Patient with younger students",
      interests: "Cooking and animation",
      needs: "Needs written steps for unfamiliar routines",
      family_priorities: "Safe community access and self-advocacy",
      student_voice: "I want to learn at a real job site.",
    });
    expect(buildPathwayStudentPrefill({ ...snapshot, student: null })).toBeNull();
  });

  it("accepts BridgeForward and keeps the selected student linked through the payload", () => {
    const parsed = PathwayIntakeFormSchema.parse({
      ...createPathwayIntakeDefaults(),
      student_id: "11111111-1111-4111-8111-111111111111",
      student_first_name: "Jordan",
      grade_band: "6-8",
    });
    const payload = mergePathwayIntake(parsed);

    expect(payload.student_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(payload.grade_band).toBe("6-8");
  });

  it("folds the new structured details into existing bounded engine fields", () => {
    const values = PathwayIntakeFormSchema.parse({
      ...createPathwayIntakeDefaults(),
      student_first_name: "Jordan",
      learning_preferences: "Practices a choice before deciding.",
      assistive_technology: "Uses speech-to-text.",
      accommodations: "Receives written directions.",
      readiness_evidence: "Completed four job steps with one prompt.",
      evidence_source_dates: "Job coach log, September 18.",
      information_to_verify: "Confirm the current travel-training provider.",
    });
    const payload = mergePathwayIntake(values);

    expect(PATHWAY_STRUCTURED_DETAIL_FIELDS).toHaveLength(6);
    expect(payload.supports).toContain(
      "Learning and decision preferences: Practices a choice before deciding.",
    );
    expect(payload.supports).toContain("Assistive technology: Uses speech-to-text.");
    expect(payload.supports).toContain("Accommodations: Receives written directions.");
    expect(payload.educator_input).toContain(
      "Readiness evidence: Completed four job steps with one prompt.",
    );
    expect(payload.educator_input).toContain(
      "Evidence and source dates: Job coach log, September 18.",
    );
    expect(payload.family_concerns_extended).toContain(
      "Information to verify: Confirm the current travel-training provider.",
    );
  });

  it("requires the signed-in route to select authorized students and clear stale drafts", () => {
    for (const contract of [
      "listStudents",
      "getDashboardSnapshot",
      "buildPathwayStudentPrefill",
      "Clear every prior answer before the new profile request begins",
      "Choose the connected student this report belongs to.",
      "studentRequestRef.current !== requestId",
      "form.reset({",
    ]) {
      expect(ROUTE).toContain(contract);
    }
    expect(ROUTE).not.toMatch(/DEMO_|useDemoStudent|Jordan Rivera/);
  });

  it("authorizes and links both intake and report at creation time", () => {
    expect(SERVER).toContain("student_id: z.string().uuid().optional()");
    expect(SERVER).toContain('action: "edit"');
    expect(SERVER).toContain("resourceId: data.student_id");
    expect(SERVER.match(/student_id: data\.student_id \?\? null/g)).toHaveLength(2);
    expect(SERVER).toContain("initial report provenance link failed");
  });

  it("keeps IEP-derived accessibility details inside the redacted text boundary", () => {
    for (const field of [
      "assistive_technology",
      "accommodations",
      "services_received",
      "readiness_evidence",
      "evidence_source_dates",
    ]) {
      expect(IEP_EXTRACT).toContain(field);
      expect(ROUTE).toContain(`"${field}"`);
    }
    expect(IEP_EXTRACT).toContain("redactSensitiveText(data.text).text");
    expect(IEP_EXTRACT).toContain('"6-8"');
  });
});
