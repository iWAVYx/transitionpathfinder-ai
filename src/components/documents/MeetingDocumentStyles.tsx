/** Readable document presentation; editing controls keep their existing behavior. */
export function MeetingDocumentStyles() {
  return <style>{`
    [data-meeting-document] h1 { font-size: clamp(1.5rem, 3vw, 1.9rem); }
    [data-meeting-document] h2 { font-size: 1.2rem; }
    [data-meeting-document] h3 { font-size: 1rem; }
    [data-meeting-document] [data-meeting-action-status],
    [data-meeting-document] [data-meeting-agenda-status] { display: none; }
    @media print {
      [data-meeting-document] { padding-left: 30px !important; }
      [data-meeting-document] [data-document-watermark] {
        top: 0; bottom: auto; left: 0; width: 20px; height: 20px;
      }
      [data-meeting-document] .rounded-2xl {
        border: 0; border-bottom: 1px solid #ded8e7; border-radius: 0;
        box-shadow: none; padding: 12px 0;
      }
      [data-meeting-document] .rounded-xl {
        border: 0; border-bottom: 1px solid #eee8f2; border-radius: 0;
        padding: 8px 0; background: transparent;
      }
      [data-meeting-document] > .mt-8 { margin-top: 18px; }
      [data-meeting-document] [data-meeting-action-status],
      [data-meeting-document] [data-meeting-agenda-status] { display: inline; }
      [data-meeting-document] .opacity-60 { opacity: 1; }
      [data-meeting-document] [data-meeting-short-section] { break-inside: avoid; }
      [data-meeting-document] input[type="checkbox"] { display: none; }
      [data-meeting-document] .line-through { text-decoration: none; }
    }
  `}</style>;
}
