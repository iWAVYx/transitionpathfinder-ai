/** One heading hierarchy and balanced page geometry for actual document outputs. */
export function DocumentLayoutStyles() {
  return <style>{`
    @media print {
      [data-generated-document] [data-value-callout-row]:not([data-value-callout-row="questionsForTeam"]),
      [data-generated-document] [data-value-callout-question] {
        break-inside: avoid !important; page-break-inside: avoid !important;
      }
      [data-generated-document] [data-value-callout-label] {
        break-after: avoid !important; page-break-after: avoid !important;
      }
    }

    body:has([data-generated-document]) [data-generated-document][data-generated-document] h1,
    body:has([data-generated-document]) [data-generated-document][data-generated-document] h2,
    body:has([data-generated-document]) [data-generated-document][data-generated-document] h3,
    body:has([data-generated-document]) [data-generated-document][data-generated-document] h4 {
      font-family: "Times New Roman", Times, serif !important;
      font-weight: 500 !important; line-height: 1.25 !important;
      text-align: left !important; text-transform: none !important;
      letter-spacing: normal !important; justify-content: flex-start !important;
      gap: 8px; text-wrap: balance;
    }
    body:has([data-generated-document]) [data-generated-document][data-generated-document] h1 { font-size: clamp(1.5rem, 3vw, 1.9rem) !important; }
    body:has([data-generated-document]) [data-generated-document][data-generated-document] h2 { font-size: 1.25rem !important; }
    body:has([data-generated-document]) [data-generated-document][data-generated-document] h3, body:has([data-generated-document]) [data-generated-document][data-generated-document] h4 { font-size: 1rem !important; }
    /* Document labels use readable title styling instead of editorial all caps. */
    [data-generated-document] :is(.pub-callout-label, .pub-sidebar-label, .pub-checklist-title, [data-document-subheading]) {
      text-transform: none !important; letter-spacing: normal !important;
      text-align: left !important; font-weight: 600; line-height: 1.4;
    }
    /* Major sections share a restrained band; subsections use a lighter rule. */
    [data-generated-document] h2 {
      padding: 8px 12px; border-left: 3px solid #6b3a91;
      border-bottom: 1px solid #ded3e8; background: #f7f2fa;
      color: #512875; box-sizing: border-box; width: 100%; min-width: 0;
      print-color-adjust: exact; -webkit-print-color-adjust: exact;
      break-after: avoid; page-break-after: avoid;
    }
    [data-generated-document] h3 {
      padding-bottom: 6px; border-bottom: 1px solid #ded3e8;
      color: var(--foreground, #242a33); break-after: avoid; page-break-after: avoid;
    }
    /* Chapter bands and their section bands share the same horizontal edge. */
    .report-shell [data-generated-document] .report-stage > header {
      padding-left: 0 !important; padding-right: 0 !important;
    }
    .report-shell [data-generated-document] .report-stage > header::before {
      left: 0 !important;
    }
    /* Decorative markers must not create a different text inset for each title. */
    [data-generated-document] :is(h2, h3, h4):has(> svg) { display: flex; }
    [data-generated-document] :is(h2, h3, h4) > svg {
      order: 1; margin-left: auto; flex-shrink: 0; align-self: center;
    }
    [data-generated-document] [data-report-block-heading] > :is(button, div) {
      padding: 8px 12px; border-left: 3px solid #6b3a91;
      border-bottom: 1px solid #ded3e8; background: #f7f2fa;
      box-sizing: border-box; min-width: 0; gap: 8px;
      print-color-adjust: exact; -webkit-print-color-adjust: exact;
    }
    [data-generated-document] [data-report-block-heading] > :is(button, div) > h2 {
      order: -1; flex: 1; min-width: 0; width: auto;
      padding: 0 !important; margin: 0 !important;
      border: 0 !important; background: transparent !important;
    }
    [data-generated-document] .section-number { flex-shrink: 0; white-space: nowrap; }
    [data-generated-document] header { text-align: left !important; justify-content: space-between !important; }
    [data-generated-document] [data-document-title-block] { width: 100%; text-align: left; }
    [data-generated-document] [data-document-columns],
    [data-generated-document] .pub-spread { gap: 24px !important; align-items: start; }
    [data-generated-document] [data-document-columns] > *,
    [data-generated-document] .pub-spread > * { min-width: 0; }
    @media print {
      [data-generated-document] [data-report-pathway-detail],
      [data-generated-document] .pub-sidebar .pub-checklist { break-inside: avoid !important; page-break-inside: avoid !important; }
      [data-generated-document] h2 { padding: 6px 10px; }
      [data-generated-document] [data-report-block-heading] > :is(button, div) {
        padding: 6px 10px;
      }
      [data-generated-document] h3 { padding-bottom: 4px; color: #512875; }

      body:has([data-generated-document]) [data-generated-document][data-generated-document] {
        padding-left: 24px !important; padding-right: 24px !important; box-sizing: border-box;
      }
      body:has([data-generated-document]) [data-generated-document][data-generated-document] h1 { font-size: 22pt !important; }
      body:has([data-generated-document]) [data-generated-document][data-generated-document] h2 { font-size: 15pt !important; }
      body:has([data-generated-document]) [data-generated-document][data-generated-document] h3,
      body:has([data-generated-document]) [data-generated-document][data-generated-document] h4 { font-size: 11.5pt !important; }
      body:has([data-generated-document]) [data-generated-document][data-generated-document] [data-document-watermark] {
        top: 0; right: 0; bottom: auto; left: auto; width: 20px; height: 20px;
      }
      body:has([data-generated-document]) [data-generated-document][data-generated-document] [data-document-columns],
      body:has([data-generated-document]) [data-generated-document][data-generated-document] .pub-spread { gap: 24px !important; }
      body:has([data-generated-document]) [data-generated-document][data-generated-document] .pub-spread > * {
        padding-left: 0 !important; padding-right: 0 !important; border-left: 0 !important;
      }
    }
  `}</style>;
}
