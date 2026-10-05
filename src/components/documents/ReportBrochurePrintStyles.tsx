/** Keep the report's editorial design while avoiding a separate page for every note. */
export function ReportBrochurePrintStyles() {
  return <style>{`
    @media print {
      body:has(.report-root) .report-root .page-break,
      body:has(.report-root) .report-root .report-stage,
      body:has(.report-root) .report-root .report-section,
      body:has(.report-root) .report-root .rounded-2xl,
      body:has(.report-root) .report-root .rounded-3xl {
        break-inside: auto !important; page-break-inside: auto !important;
      }
      body:has(.report-root) .report-root p,
      body:has(.report-root) .report-root li,
      body:has(.report-root) .report-root .pub-page-body {
        font-size: 10.5pt !important; line-height: 1.45 !important;
      }
      body:has(.report-root) .report-root .pub-callout,
      body:has(.report-root) .report-root .pub-checklist,
      body:has(.report-root) .report-root .pub-source {
        margin-top: 0.12in !important; margin-bottom: 0.12in !important;
      }

      body:has(.report-root) .report-root .report-section,
      body:has(.report-root) .report-root .report-header,
      body:has(.report-root) .report-root .exec-summary {
        break-before: auto !important; break-after: auto !important;
        page-break-before: auto !important; page-break-after: auto !important;
      }
      body:has(.report-root) .report-root .pub-page,
      body:has(.report-root) .report-root .eh-page,
      body:has(.report-root) .report-root .eh-chapter {
        min-height: 0 !important; height: auto !important;
        break-before: auto !important; break-after: auto !important; break-inside: auto !important;
        page-break-before: auto !important; page-break-after: auto !important; page-break-inside: auto !important;
        padding: 0.2in !important; margin: 0.15in 0 !important;
      }
      body:has(.report-root) .report-root .eh-chapter { break-inside: avoid !important; }
    }
  `}</style>;
}
