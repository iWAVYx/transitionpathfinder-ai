import { DocumentPrintStyles } from "@/components/documents/DocumentPrintStyles";
import { PathwayDocumentPresentation } from "@/components/documents/PathwayDocumentPresentation";
import { ReportIepSummary } from "@/components/documents/ReportIepSummary";
import { ReportV2SnapshotHeader, ReportV2ExtrasBody } from "@/components/pathway/ReportV2Extras";
import { OPTIONAL_REPORT_EXAMPLE } from "@/lib/demo/optional-report-example";

/** Printable excerpt of optional sections, using the actual product renderers. */
export function DemoOptionalReportDocument({ audience }: { audience: "student" | "family" | "educator" }) {
  const source = OPTIONAL_REPORT_EXAMPLE;
  return (
    <article className="report-root" data-generated-document data-print-document data-report-optional-example>
      <DocumentPrintStyles />
      <PathwayDocumentPresentation sample />
      <header className="mb-6">
        <h1 className="font-display text-2xl">Sample Plan Details and Review Notes</h1>
        <p className="mt-2 text-sm">These fictional examples use the signed-in report's section layout. IEP means Individualized Education Program. This is a section preview, not a complete report or a document-upload demonstration.</p>
      </header>
      <ReportV2SnapshotHeader content={source} audience={audience} studentName="Maya — Fictional Example" />
      <ReportIepSummary iep={source.iep_plan_summary!} audience={audience} />
      <ReportV2ExtrasBody content={source} audience={audience} />
    </article>
  );
}
