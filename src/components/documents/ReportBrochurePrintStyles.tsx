/** Keep the report's editorial design while avoiding a separate page for every note. */
export function ReportBrochurePrintStyles() {
  return <style>{`
    @media print {
      /* A consistent body page keeps the corner mark and page count stable. */
      @page report-brochure {
        size: Letter; margin: 0.5in;
        @top-left { content: "TransitionForward"; font: 600 8.5pt sans-serif; color: #6b7280; }
        @bottom-left { content: "Pathway Report"; font: 400 8.5pt sans-serif; color: #9ca3af; }
        @bottom-right { content: counter(page) " / " counter(pages); font: 500 8.5pt sans-serif; color: #6b7280; }
      }
      body:has(.report-root) .report-root { page: report-brochure; }
      body:has(.report-root) .report-root .report-stage { margin-top: 0.2in !important; }
      body:has(.report-root) .report-root .report-stage > header {
        margin-bottom: 0.12in !important; padding-top: 0.12in !important; break-inside: avoid;
      }
      body:has(.report-root) .report-root #sec-thirty-day ol > li {
        padding-top: 0.12in !important; padding-bottom: 0.12in !important;
      }
      body:has(.report-root) .report-root [data-report-printed-goals] .uppercase { text-transform: none; letter-spacing: normal; }
      body:has(.report-root) .report-root [data-report-printed-goals] > section { break-inside: avoid; }
      body:has(.report-root) .report-root .pub-page-runninghead { display: none !important; }
      body:has(.report-root) .report-root .pub-spread { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.2in; }
      body:has(.report-root) .report-root .pub-spread > * { min-width: 0; }
      body:has(.report-root) .report-root .pub-spread-side {
        border-top: 0; border-left: 1px solid #ded8e7; padding-top: 0; padding-left: 0.15in;
      }
      body:has(.report-root) .report-root [class*="line-clamp-"] {
        display: block !important; -webkit-line-clamp: unset !important;
        overflow: visible !important; max-height: none !important;
      }
      body:has(.report-root) .report-root .truncate {
        white-space: normal !important; overflow: visible !important; text-overflow: clip !important;
      }
      body:has(.report-root) .report-root [data-document-caution] { break-inside: avoid; }
      body:has(.report-root) .report-root .pub-checklist-tick { color: #5b2a86 !important; }
      body:has(.report-root) .report-root .pub-checklist li { padding: 0.05in 0; }
      body:has(.report-root) .report-root .pub-page-opener { margin-bottom: 0.12in !important; }
      body:has(.report-root) .report-root .pub-page-rule { margin-top: 0.1in !important; }
      body:has(.report-root) .report-root .pub-page-body h2,
      body:has(.report-root) .report-root .pub-page-body h3 { margin-top: 0.15in !important; }

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
