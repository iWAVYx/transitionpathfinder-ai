import { ContextualBackLink } from "@/components/navigation/NavigationOriginProvider";
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { ReportView } from "@/components/pathway/ReportView";
import { DEMO_STUDENTS } from "@/lib/demo-data";

/** Prepared baseline uses the actual product reader, with no student IDs or save callbacks. */
type ReportAudience = "student" | "family" | "educator";
export function BuilderSampleReport({ audience, view = audience }: { audience: "family" | "educator"; view?: ReportAudience }) {
  return <BuilderSampleReportReader key={`${audience}:${view}`} audience={audience} view={view} />;
}

function BuilderSampleReportReader({ audience, view }: { audience: "family" | "educator"; view: ReportAudience }) {
  const navigate = useNavigate();
  const sample = DEMO_STUDENTS.maya;
  const [builderAudience, setBuilderAudience] = useState(audience);
  const [reportAudience, setReportAudience] = useState(view);
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <ContextualBackLink to="/demo/intake" search={{ role: builderAudience }} label="← Back to Pathway Builder" className="text-sm font-medium text-primary hover:underline" />
        <section
          className="my-5 rounded-2xl border bg-card p-5"
          aria-label="Prepared sample report notice"
        >
          <h2 className="font-display text-2xl">Prepared Example: Maya's Pathway Report</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This fictional report accompanies the builder's original sample answers. It does not
            reflect your edits. Use the input-based draft in the builder to review those changes. No
            report is saved to your account.
          </p>
          <Link to="/demo/report" search={{ example: "plan-details", role: builderAudience, view: reportAudience }} className="mt-3 inline-block text-sm font-medium text-primary underline">
            See Sample Plan Details and Review Notes
          </Link>
        </section>
        <ReportView
          name={sample.profile.first_name}
          report={sample.report}
          demo
          initialAudience={view}
          onAudienceChange={(next) => {
            // Student is a valid report lens, but not a Pathway Builder submitter.
            const returnAudience = next === "family" || next === "educator" ? next : builderAudience;
            setBuilderAudience(returnAudience);
            setReportAudience(next);
            void navigate({
              to: "/demo/report",
              search: (previous: Record<string, unknown>) => ({ ...previous, role: returnAudience, view: next }),
              resetScroll: false,
            });
          }}
          meta={{
            reportId: sample.reportId,
            issued: sample.issued,
            confidentiality: "Fictional sample only — contains no real student records.",
          }}
        />
      </div>
    </SiteShell>
  );
}
