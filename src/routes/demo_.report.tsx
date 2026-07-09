import { createFileRoute } from "@tanstack/react-router";

import {
  DEFAULT_DEMO_STUDENT,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { ReportView } from "@/components/pathway/ReportView";
import { PathwayReportLayout } from "@/components/pathway/report/PathwayReportLayout";
import { getDemoStudent } from "@/lib/demo-data";
import { EXTENDED_PLANS } from "@/lib/demo-extended-plans";
import { StudioPage } from "@/studio/StudioPage";
import { StudioAside } from "@/studio/StudioShell";

export const Route = createFileRoute("/demo_/report")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Sample Pathway Report — TransitionForward Demo" },
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
  const search = Route.useSearch();
  const s = search.s ?? DEFAULT_DEMO_STUDENT;
  const bundle = getDemoStudent(s);
  const { profile: student, report, reportId, issued } = bundle;

  return (
    <StudioPage
      stage="report"
      student={s}
      preserveStudent={!!search.s}
      title={
        <>
          A pathway, <em>made visible.</em>
        </>
      }
      dek={`The synthesis: ${student.first_name}'s intake, voice, and documents combined into a single shared plan with audience-specific views.`}
    >
      <StudioAside kind="source" label="What you're reading">
        The Pathway Report is the central document the studio produces. It
        carries the student's strengths and own words at the top, then walks
        the team through readiness, recommended pathways, supports, and
        questions for the next meeting. Audience tabs adjust the language
        without changing the substance.
      </StudioAside>

      <div className="st-frame">
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
      </div>
    </StudioPage>
  );
}
