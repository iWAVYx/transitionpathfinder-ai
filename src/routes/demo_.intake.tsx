import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Sparkles } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { Badge } from "@/components/ui/badge";
import { getDemoStudent } from "@/lib/demo-data";

import { toTitleCase } from "@/lib/title-case";
export const Route = createFileRoute("/demo_/intake")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Sample intake — TransitionForward demo" },
      {
        name: "description",
        content:
          "See the guided intake a family completed for a fictional 11th grade student.",
      },
      { property: "og:url", content: "/demo/intake" },
    ],
    links: [{ rel: "canonical", href: "/demo/intake" }],
  }),
  component: DemoIntakePage,
});

function DemoIntakePage() {
  const { s = "maya" as const } = Route.useSearch();
  const bundle = getDemoStudent(s);
  const { profile: student, intake } = bundle;

  const sections: { label: string; fields: { label: string; value: string; helper?: string }[] }[] = [
    {
      label: "Who's filling this out",
      fields: [
        {
          label: "Role",
          value: roleLabel(intake.submitter_role),
          helper: "We tailor the report's language to who is reading it.",
        },
        { label: "Student's first name", value: intake.student_first_name },
        { label: "Grade band", value: gradeLabel(intake.grade_band) },
      ],
    },
    {
      label: "Strengths & interests",
      fields: [
        {
          label: "What is the student good at?",
          value: intake.strengths,
          helper: "Specific, observable strengths anchor the whole report.",
        },
        { label: "What does the student enjoy?", value: intake.interests },
      ],
    },
    {
      label: "Needs & supports",
      fields: [
        { label: "Disability-related needs", value: intake.needs },
        {
          label: "Supports that work",
          value: intake.supports,
          helper: "We use these to recommend realistic accommodations for each pathway.",
        },
        { label: "Transportation", value: intake.transportation },
        { label: "Communication", value: intake.communication },
      ],
    },
    {
      label: "Services & communication preferences",
      fields: [
        {
          label: "Services currently received",
          value: intake.services_received ?? "",
          helper: "We surface the supports already in place so the plan builds on — not duplicates — them.",
        },
        {
          label: "How the team prefers to communicate",
          value: intake.communication_prefs ?? "",
        },
        {
          label: "Transportation needs (detail)",
          value: intake.transportation_needs ?? "",
        },
      ],
    },
    {
      label: "Current goals & concerns",
      fields: [
        {
          label: "Current IEP transition goals",
          value: intake.current_goals,
          helper: "We translate these into plain English in the report.",
        },
        { label: "Family concerns", value: intake.family_concerns },
        {
          label: "Family concerns (in detail)",
          value: intake.family_concerns_extended ?? "",
        },
        {
          label: "What the student is worried about",
          value: intake.student_worries ?? "",
          helper: "Named directly so the team can plan around it.",
        },
      ],
    },
    {
      label: "Looking ahead",
      fields: [
        {
          label: "Family priorities for life after school",
          value: intake.family_priorities ?? "",
        },
        {
          label: "Desired postsecondary outcomes",
          value: intake.desired_postsecondary_outcomes ?? "",
          helper: "These anchor the recommended pathways and the 30-day plan.",
        },
        {
          label: "Upcoming meetings & deadlines",
          value: intake.upcoming_meetings ?? "",
        },
      ],
    },
    {
      label: "The three voices",
      fields: [
        {
          label: "In the student's own words",
          value: intake.student_voice,
          helper: "Student voice carries the most weight in our recommendations.",
        },
        { label: "From the family", value: intake.family_voice },
        { label: "From the educator / case manager", value: intake.educator_input },
      ],
    },
  ];

  return (
    <SiteShell>
      <div className="demo-shell">
        <DemoStepBar current="intake" student={s} />

      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> Step 2 · Intake
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Fictional student
          </Badge>
        </div>
        <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
          Sample intake for {toTitleCase(student.full_name)}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This is what the guided transition-planning interview looks like once a family or
          educator finishes. We use this to draft the Pathway Report on the next screen.
        </p>

        <div className="mt-8 space-y-6">
          {sections.map((section, i) => (
            <div key={section.label} className="rounded-3xl border bg-card shadow-soft">
              <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
                <h2 className="font-display text-lg">{toTitleCase(section.label)}</h2>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Section {i + 1} of {sections.length}
                </span>
              </div>
              <dl className="divide-y divide-border/60">
                {section.fields.map((field) => (
                  <div key={field.label} className="grid gap-2 px-6 py-5 sm:grid-cols-[200px_1fr]">
                    <dt>
                      <p className="text-sm font-medium text-foreground">{field.label}</p>
                      {field.helper && (
                        <p className="mt-1 text-xs leading-snug text-muted-foreground">
                          {field.helper}
                        </p>
                      )}
                    </dt>
                    <dd className="text-sm leading-relaxed text-foreground/85">
                      {field.value || (
                        <span className="text-muted-foreground italic">Not provided</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <DemoStepFooter current="intake" student={s} />
      </section>
      </div>
    </SiteShell>
  );
}

function roleLabel(r: string) {
  return r === "family"
    ? "Family member (parent or caregiver)"
    : r === "student"
      ? "Student"
      : "Educator / case manager";
}

function gradeLabel(g?: string) {
  switch (g) {
    case "9-10":
      return "9th–10th grade";
    case "11-12":
      return "11th–12th grade";
    case "post-secondary":
      return "Post-secondary (18–22)";
    case "not-applicable":
      return "Not applicable";
    default:
      return "Not specified";
  }
}
