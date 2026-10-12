import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { ReportView } from "@/components/pathway/ReportView";
import { DEMO_STUDENTS } from "@/lib/demo-data";

/** Prepared baseline uses the actual product reader, with no student IDs or save callbacks. */
export function BuilderSampleReport({ audience }: { audience: "family" | "educator" }) {
  return <BuilderSampleReportReader key={audience} audience={audience} />;
}

function BuilderSampleReportReader({ audience }: { audience: "family" | "educator" }) {
  const navigate = useNavigate();
  const sample = DEMO_STUDENTS.maya;
  const [builderAudience, setBuilderAudience] = useState(audience);
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/demo/intake" search={{ role: builderAudience }} className="text-sm font-medium text-primary hover:underline">
          ← Back to Pathway Builder
        </Link>
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
        </section>
        <ReportView
          name={sample.profile.first_name}
          report={sample.report}
          demo
          initialAudience={audience}
          onAudienceChange={(next) => {
            // Student is a valid report lens, but not a Pathway Builder submitter.
            const returnAudience = next === "family" || next === "educator" ? next : builderAudience;
            setBuilderAudience(returnAudience);
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
