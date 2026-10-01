import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { ReportView } from "@/components/pathway/ReportView";
import { DEMO_STUDENTS } from "@/lib/demo-data";

/** Prepared baseline uses the actual product reader, with no student IDs or save callbacks. */
export function BuilderSampleReport({ audience }: { audience: "family" | "educator" }) {
  const sample = DEMO_STUDENTS.maya;
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/demo/intake" className="text-sm font-medium text-primary hover:underline">
          ← Back to Pathway Builder
        </Link>
        <section
          className="my-5 rounded-2xl border bg-card p-5"
          aria-label="Prepared sample report notice"
        >
          <h1 className="font-display text-2xl">Prepared example: Maya's Pathway Report</h1>
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
