/** Compact brochure presentation for the real PPT document on screen and paper. */
export function PptBrochureStyles() {
  return <style>{`
    [data-ppt-print-packet] { font-size: 14px; }
    [data-ppt-print-packet] p, [data-ppt-print-packet] li { font-size: 14px; line-height: 1.5; }
    [data-ppt-print-packet] h1 { font-size: clamp(1.5rem, 3vw, 1.9rem); line-height: 1.2; }
    [data-ppt-print-packet] h2 { font-size: 1.25rem; }
    [data-ppt-print-packet] [data-document-section] { margin-top: 24px; }
    [data-ppt-print-packet] [data-document-section] > div { margin-top: 10px; }
    [data-ppt-print-packet] [data-document-columns] { display: grid; gap: 24px; }
    [data-ppt-print-packet] [data-document-agenda-item] { border-bottom: 1px solid #e0dbe7; padding: 10px 0; }
    [data-ppt-print-packet] [data-document-script] { border-left: 3px solid #d8c9e5; padding: 8px 12px; }
    @media (min-width: 700px), print {
      [data-ppt-print-packet] [data-document-columns] { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    }
    @media print {
      [data-ppt-print-packet] [data-document-section] { margin-top: 18px; }
      [data-ppt-print-packet] [data-document-callout] { margin-top: 18px; padding: 14px; }
    }
  `}</style>;
}
