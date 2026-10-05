/** Isolate document content from navigation and injected floating controls when printing. */
export function DocumentPrintStyles() {
  return <style>{`
    @media print {
      @page { size: Letter; margin: 0.65in; }
      body:has([data-print-document]) * { visibility: hidden; }
      [data-print-document], [data-print-document] * { visibility: visible; }
      body:has([data-print-document]) header,
      body:has([data-print-document]) footer { display: none !important; }
      .site-shell-main:has([data-print-document]) > :not([data-print-document]):not(:has([data-print-document])) { display: none !important; }
      [data-print-document] { max-width: none; padding: 0; font-size: 11pt; line-height: 1.5; color: #111; background: white; }
      [data-print-document] h1 { font-size: 24pt; }
      [data-print-document] h2 { font-size: 16pt; break-after: avoid; }
      [data-print-document] p { orphans: 3; widows: 3; }
      [data-print-document] li { break-inside: avoid; }
      [data-print-document] button,
      [data-print-document] .print\\:hidden { display: none !important; }
    }
  `}</style>;
}
