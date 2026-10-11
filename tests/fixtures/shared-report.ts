import { DEMO_STUDENTS } from "../../src/lib/demo-data";
const report = () => structuredClone(DEMO_STUDENTS.maya.report);
const id = "a1111111-1111-4111-8111-111111111111";
const plan = (intro: string) => ({ intro, horizons: { thirty_day: [intro], ninety_day: [intro], six_month: [intro], one_year: [intro] } });
export function richerSharedFixture() {
  const recommendation = { title: "Explore a supported visit", summary: "Explore options", why: "Recorded interests",
    sources: [{ kind: "profile", id, label: "A recorded profile observation" }], next_action: "Discuss a visit",
    owner_role: "family", discuss_at_next_meeting: true, related_goal_id: id };
  return { ...report(), schema_version: 2,
    student_snapshot: { display_name: "Maya", grade: "12", school: "Sample School" },
    employment_pathway_recs: [recommendation], resource_matches: [{ ...recommendation, resource_id: id, url: "https://example.org/resources/support-guide" }],
    partner_matches: [{ ...recommendation, partner_id: id, opportunity_id: id, url: "https://example.org/programs/supported-visit" }],
    iep_plan_summary: { source_doc_ids: [id], present_levels: "Recorded abilities", transition_goals: [], accommodations: [], services: [] },
    inputs_used: { profile: true, student_voice_keys: ["private-answer-key"], iep_doc_ids: [id], goal_ids: [id, id] },
    student_action_plan: plan("Student steps"), family_action_plan_v2: plan("Family steps"), educator_action_plan_v2: plan("Educator steps"),
    plain_language_summary: "Family summary", professional_summary: "Educator summary",
    meeting_prep_questions: [{ question: "Family question", for_audience: "family" }, { question: "Educator question", for_audience: "educator" }],
    audience_messages: { family: { employment_pathway: "Family message", hidden: "Hidden message" }, educator: { employment_pathway: "Educator message" } },
    private_notes: "Private notes",
  };
}
