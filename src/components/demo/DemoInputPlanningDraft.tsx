import type { PathwayIntakeFormValues } from "@/lib/pathway-intake";
import {
  PathwayReportBody,
  type PathwayReportSections,
} from "@/components/pathway/report/PathwayReportBody";

type Field = keyof PathwayIntakeFormValues;
const GROUPS: Array<{ section: keyof PathwayReportSections; fields: Array<[Field, string]> }> = [
  {
    section: "student_snapshot",
    fields: [
      ["student_first_name", "First name"],
      ["grade_band", "Grade band"],
    ],
  },
  {
    section: "student_voice",
    fields: [
      ["student_voice", "Student voice"],
      ["student_worries", "Student worries"],
    ],
  },
  {
    section: "strengths_preferences_interests_needs",
    fields: [
      ["strengths", "Strengths"],
      ["interests", "Interests"],
      ["needs", "Needs"],
      ["learning_preferences", "Learning preferences"],
      ["communication", "Communication"],
      ["communication_prefs", "Communication preferences"],
    ],
  },
  {
    section: "family_action_plan",
    fields: [
      ["family_voice", "Family voice"],
      ["family_priorities", "Family priorities"],
      ["family_concerns", "Family concerns"],
      ["family_concerns_extended", "Additional family concerns"],
    ],
  },
  { section: "meeting_prep_questions", fields: [["upcoming_meetings", "Meeting context"]] },
  {
    section: "educator_action_plan",
    fields: [
      ["educator_input", "Educator input"],
      ["teacher_observations", "Teacher observations"],
      ["current_goals", "Current goals"],
      ["supports", "Supports"],
      ["services_received", "Services"],
      ["accommodations", "Accommodations"],
      ["assistive_technology", "Assistive technology"],
    ],
  },
  {
    section: "data_gaps",
    fields: [
      ["readiness_evidence", "Reported evidence — not verified"],
      ["evidence_source_dates", "Reported sources and dates"],
      ["information_to_verify", "Information to verify"],
    ],
  },
  {
    section: "postsecondary_goals",
    fields: [
      ["career_goals", "Career goals"],
      ["education_goals", "Education goals"],
      ["desired_postsecondary_outcomes", "Desired outcomes"],
      ["life_skills", "Daily-life skills"],
      ["transportation", "Transportation"],
      ["transportation_needs", "Transportation needs"],
    ],
  },
];

/** Deterministic input handoff: no invented evidence, scores, eligibility or opportunities. */
export function DemoInputPlanningDraft({ values }: { values: PathwayIntakeFormValues }) {
  const sections: PathwayReportSections = {};
  for (const group of GROUPS) {
    sections[group.section] = (
      <dl className="space-y-4 rounded-2xl border bg-card p-5">
        {group.fields.map(([field, label]) => (
          <div key={field}>
            <dt className="text-sm font-semibold">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {values[field]?.trim() || "Not provided — review with the team."}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <section className="mt-8" aria-label="Planning draft from your sample answers">
      <h2 className="font-display text-2xl">
        {values.student_first_name}'s input-based planning draft
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Source: the fictional answers submitted in this builder ({values.submitter_role}{" "}
        perspective). This uses the signed-in report's stage layout. It organizes your inputs; it
        does not assess readiness, verify documents, generate recommendations, or save a real
        student record.
      </p>
      <PathwayReportBody
        sections={sections}
        appendix={
          <p className="text-sm">
            Next: review missing information and confirm these inputs with the student and team
            before using them for planning. No dates or responsibilities have been agreed.
          </p>
        }
      />
    </section>
  );
}
