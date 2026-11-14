/** Readable document presentation; editing controls keep their existing behavior. */
export function MeetingDocumentStyles() {
  return <style>{`
    [data-meeting-document] h1 { font-size: clamp(1.5rem, 3vw, 1.9rem); }
    [data-meeting-document] h2 { font-size: 1.2rem; }
    [data-meeting-document] h3 { font-size: 1rem; }
    [data-meeting-document] [data-meeting-action-status],
    [data-meeting-document] [data-meeting-agenda-status] { display: none; }
    @media print {
      [data-meeting-document] [data-document-watermark] {
        top: 0; right: 0; bottom: auto; left: auto; width: 20px; height: 20px;
      }
      [data-meeting-document] .rounded-2xl {
        border: 0; border-bottom: 1px solid #ded8e7; border-radius: 0;
        box-shadow: none; padding: 8px 0;
      }
      [data-meeting-document] .rounded-xl {
        border: 0; border-bottom: 1px solid #eee8f2; border-radius: 0;
        padding: 6px 0; background: transparent;
      }
      [data-meeting-document] > .mt-8 { margin-top: 8px; }
      /* The editing sidebar becomes balanced follow-up columns on paper. */
      [data-meeting-document] [data-document-print-header] { margin-bottom: 12px; }
      [data-meeting-document] [data-meeting-content] { display: block; }
      [data-meeting-document] [data-meeting-followups] {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 24px; margin-top: 12px; align-items: start;
      }
      [data-meeting-document] [data-meeting-followups] > * {
        min-width: 0; margin-top: 0 !important;
      }
      [data-meeting-document] [data-meeting-action-status],
      [data-meeting-document] [data-meeting-agenda-status] { display: inline; }
      [data-meeting-document] h3 { margin-top: 8px; }
      [data-meeting-document] [data-meeting-summary-fields] {
        grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px 24px;
      }
      [data-meeting-document] [data-meeting-summary-field]:first-child { grid-column: 1 / -1; }
      [data-meeting-document] [data-meeting-summary-field] {
        break-inside: avoid; page-break-inside: avoid;
      }
      [data-meeting-document] [data-meeting-summary-field] > span {
        break-after: avoid; page-break-after: avoid;
      }
      /* Discussion notes may span pages; keep their label with the first lines. */
      [data-meeting-document] [data-meeting-summary-field]:first-child {
        break-inside: auto; page-break-inside: auto;
      }
      [data-meeting-document] [data-meeting-summary-field] > [data-document-field-value] {
        break-before: avoid; page-break-before: avoid;
      }
      [data-meeting-document] .opacity-60 { opacity: 1; }
      [data-meeting-document] [data-meeting-short-section] { break-inside: avoid; }
      [data-meeting-document] input[type="checkbox"] { display: none; }
      [data-meeting-document] .line-through { text-decoration: none; }
    }
  `}</style>;
}
