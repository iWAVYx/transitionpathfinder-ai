import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, FileText } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DEFAULT_DEMO_STUDENT,
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { ReportView } from "@/components/pathway/ReportView";
import { Badge } from "@/components/ui/badge";
import { getDemoStudent } from "@/lib/demo-data";
import { EXTENDED_PLANS } from "@/lib/demo-extended-plans";

export const Route = createFileRoute("/demo_/report")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Sample Pathway Report — TransitionForward demo" },
      {
        name: "description",
        content:
          "A complete sample Pathway Report for a fictional Connecticut high school student in transition planning.",
      },
      { property: "og:url", content: "/demo/report" },
    ],
    links: [{ rel: "canonical", href: "/demo/report" }],
  }),
  component: DemoReportPage,
});

function DemoReportPage() {
  const { s = DEFAULT_DEMO_STUDENT } = Route.useSearch();
  const bundle = getDemoStudent(s);
  const { profile: student, report, reportId, issued } = bundle;

  return (
    <SiteShell>
      <div className="demo-shell report-shell">
        <DemoStepBar current="report" student={s} />

        {/* Slim intro band — no oversized hero, no floating role-view block.
            The audience views live inside the document itself. */}
        <section className="mx-auto max-w-[92rem] px-4 pb-6 pt-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> Step 3 · Pathway Report
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> Fictional Student
            </Badge>
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <FileText className="h-3 w-3" /> Report {reportId}
            </Badge>
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            A Pathway, Made Visible
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            This is the complete sample Pathway Report — the same format families
            and educators receive. Switch between Student, Family, and Educator
            views inside the document below.
          </p>
        </section>

        <ReportView
          name={student.first_name}
          report={report}
          demo
          demoStudentId={bundle.id}
          extendedPlans={EXTENDED_PLANS[bundle.id]}

          meta={{
            reportId,
            preparedFor: `${student.full_name} · ${student.grade} · ${student.school}`,
            preparedBy: `TransitionForward (AI-supported) · Reviewed by ${student.case_manager}, Case Manager`,
            issued,
            version: "1.0",
            confidentiality: `Confidential — for ${student.first_name}, family, and authorized ${student.school} team members`,
          }}
        />

        <section className="mx-auto max-w-[92rem] px-4 pb-6 sm:px-6 lg:px-8">
          <DemoStepFooter current="report" student={s} />
        </section>
      </div>
    </SiteShell>
  );
}
