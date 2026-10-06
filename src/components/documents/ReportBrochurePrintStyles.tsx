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
      body:has(.report-root) .report-root .report-stage {
        margin-top: 0.16in !important; padding: 0 !important;
        break-before: auto !important; break-after: auto !important;
      }
      body:has(.report-root) .report-root .report-stage::before,
      body:has(.report-root) .report-root .report-stage > header::before,
      body:has(.report-root) .report-root .report-stage > header::after,
      body:has(.report-root) .report-root [data-report-section]::before { display: none !important; }
      body:has(.report-root) .report-root .report-stage-sections > * + * { margin-top: 0.12in !important; }
      /* Document sections should not inherit the screen's large chapter gaps. */
      body:has(.report-root) .report-root .report-block { margin-top: 0.12in !important; }
      body:has(.report-root) .report-root [data-report-block-heading] {
        margin-bottom: 0.08in !important; padding-bottom: 0.06in !important;
      }
      body:has(.report-root) .report-root [data-report-detail-row] {
        padding-top: 0.08in !important; padding-bottom: 0.08in !important;
      }
      body:has(.report-root) .report-root .report-stage > header p {
        margin-top: 0.03in !important; margin-bottom: 0 !important;
        font-size: 9.5pt !important; line-height: 1.35 !important;
      }
      body:has(.report-root) .report-root .report-stage > header h2 { margin-top: 0.04in !important; }
      body:has(.report-root) .report-root .report-stage > header {
        margin-bottom: 0.08in !important; padding: 0.08in 0 !important; break-inside: avoid; break-after: avoid;
      }
      body:has(.report-root) .report-root #sec-thirty-day ol > li {
        padding-top: 0.12in !important; padding-bottom: 0.12in !important;
      }
      /* Keep complete weeks together, but give their details balanced columns. */
      body:has(.report-root) .report-root [data-report-plan-step] { break-inside: avoid !important; }
      body:has(.report-root) .report-root [data-report-plan-details] {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 0.15in !important; align-items: start;
      }
      body:has(.report-root) .report-root [data-report-plan-details] > * { min-width: 0; max-width: none !important; }
      body:has(.report-root) .report-root [data-report-printed-goals] .uppercase { text-transform: none; letter-spacing: normal; }
      body:has(.report-root) .report-root [data-report-printed-goals] > section { break-inside: avoid; }
      body:has(.report-root) .report-root [data-report-goal-details] {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 0.08in !important; padding-bottom: 0 !important;
      }
      body:has(.report-root) .report-root [data-report-goal-details] > * { margin-top: 0 !important; min-width: 0; }
      body:has(.report-root) .report-root [data-report-goal-details] p + p,
      body:has(.report-root) .report-root [data-report-plan-step] p + p { margin-top: 0.04in !important; }
      body:has(.report-root) .report-root [data-report-goal-details] .rounded-2xl {
        padding: 0.06in 0 !important;
      }
      body:has(.report-root) .report-root [data-report-plan-heading] { gap: 0.08in !important; }
      body:has(.report-root) .report-root [data-report-plan-details],
      body:has(.report-root) .report-root [data-report-plan-actions],
      body:has(.report-root) .report-root [data-report-plan-readiness] { margin-top: 0.08in !important; }
      body:has(.report-root) .report-root [data-report-plan-actions] {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; gap: 0.08in !important;
      }
      body:has(.report-root) .report-root [data-report-plan-step] .rounded-2xl { padding: 0.08in !important; }

      body:has(.report-root) .report-root [data-report-voice-response] { break-inside: avoid; }
      body:has(.report-root) .report-root [data-report-voice-response] .pub-pullquote { margin: 0.08in 0 !important; }
      body:has(.report-root) .report-root [data-report-voice-response] blockquote { font-size: 12pt !important; line-height: 1.4 !important; }
      body:has(.report-root) .report-root [data-report-voice-response] figcaption {
        font-size: 9.5pt !important; line-height: 1.35 !important;
        text-transform: none !important; letter-spacing: normal !important;
      }
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
      /* Keep subsection labels with their explanation when a page fills up. */
      body:has(.report-root) .report-root h2,
      body:has(.report-root) .report-root h3,
      body:has(.report-root) .report-root h4,
      body:has(.report-root) .report-root .pub-page-body p.font-semibold.uppercase {
        break-inside: avoid !important; break-after: avoid !important;
        page-break-after: avoid !important;
      }
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
        padding: 0.12in !important; margin: 0.08in 0 !important;
      }
      body:has(.report-root) .report-root .eh-chapter { break-inside: avoid !important; }
    }
  `}</style>;
}
