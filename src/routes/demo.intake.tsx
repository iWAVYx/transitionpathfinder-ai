import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_INTAKE, DEMO_STUDENT } from "@/lib/demo-data";

export const Route = createFileRoute("/demo/intake")({
  head: () => ({
    meta: [
      { title: "Sample intake — TransitionForward demo" },
      {
        name: "description",
        content:
          "See the guided intake a family completed for a fictional 11th grade student.",
      },
    ],
  }),
  component: DemoIntakePage,
});

const SECTIONS: { label: string; fields: { label: string; value: string; helper?: string }[] }[] = [
  {
    label: "Who's filling this out",
    fields: [
      {
        label: "Role",
        value: roleLabel(DEMO_INTAKE.submitter_role),
        helper: "We tailor the report's language to who is reading it.",
      },
      {
        label: "Student's first name",
        value: DEMO_INTAKE.student_first_name,
      },
      {
        label: "Grade band",
        value: gradeLabel(DEMO_INTAKE.grade_band),
      },
    ],
  },
  {
    label: "Strengths & interests",
    fields: [
      {
        label: "What is the student good at?",
        value: DEMO_INTAKE.strengths,
        helper: "Specific, observable strengths anchor the whole report.",
      },
      {
        label: "What does the student enjoy?",
        value: DEMO_INTAKE.interests,
      },
    ],
  },
  {
    label: "Needs & supports",
    fields: [
      {
        label: "Disability-related needs",
        value: DEMO_INTAKE.needs,
      },
      {
        label: "Supports that work",
        value: DEMO_INTAKE.supports,
        helper: "We use these to recommend realistic accommodations for each pathway.",
      },
      {
        label: "Transportation",
        value: DEMO_INTAKE.transportation,
      },
      {
        label: "Communication",
        value: DEMO_INTAKE.communication,
      },
    ],
  },
  {
    label: "Current goals & concerns",
    fields: [
      {
        label: "Current IEP transition goals",
        value: DEMO_INTAKE.current_goals,
        helper: "We translate these into plain English in the report.",
      },
      {
        label: "Family concerns",
        value: DEMO_INTAKE.family_concerns,
      },
    ],
  },
  {
    label: "The three voices",
    fields: [
      {
        label: "In the student's own words",
        value: DEMO_INTAKE.student_voice,
        helper: "Student voice carries the most weight in our recommendations.",
      },
      {
        label: "From the family",
        value: DEMO_INTAKE.family_voice,
      },
      {
        label: "From the educator / case manager",
        value: DEMO_INTAKE.educator_input,
      },
    ],
  },
];

function DemoIntakePage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          to="/demo"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to demo overview
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> Demo · step 1 of 3
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Fictional student
          </Badge>
        </div>
        <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
          Sample intake for {DEMO_STUDENT.full_name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This is what the guided transition-planning interview looks like once a family or
          educator finishes. We use this to draft the Pathway Report on the next screen.
        </p>

        <div className="mt-8 space-y-6">
          {SECTIONS.map((section, i) => (
            <div key={section.label} className="rounded-3xl border bg-card shadow-soft">
              <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
                <h2 className="font-display text-lg">{section.label}</h2>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Section {i + 1} of {SECTIONS.length}
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

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/60 bg-gradient-hero p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Next
            </p>
            <p className="mt-1 font-display text-xl">See the Pathway Report this intake creates.</p>
          </div>
          <Button asChild>
            <Link to="/demo/report">
              Open the report <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
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
