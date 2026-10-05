/** One heading hierarchy and balanced page geometry for actual document outputs. */
export function DocumentLayoutStyles() {
  return <style>{`
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
    [data-generated-document] header { text-align: left !important; justify-content: space-between !important; }
    [data-generated-document] [data-document-title-block] { width: 100%; text-align: left; }
    [data-generated-document] [data-document-columns],
    [data-generated-document] .pub-spread { gap: 24px !important; align-items: start; }
    [data-generated-document] [data-document-columns] > *,
    [data-generated-document] .pub-spread > * { min-width: 0; }
    @media print {
      body:has([data-generated-document]) [data-generated-document][data-generated-document] {
        padding-left: 24px !important; padding-right: 24px !important; box-sizing: border-box;
      }
      body:has([data-generated-document]) [data-generated-document][data-generated-document] h1 { font-size: 22pt !important; }
      body:has([data-generated-document]) [data-generated-document][data-generated-document] h2 { font-size: 15pt !important; }
      body:has([data-generated-document]) [data-generated-document][data-generated-document] h3,
      body:has([data-generated-document]) [data-generated-document][data-generated-document] h4 { font-size: 11.5pt !important; }
      body:has([data-generated-document]) [data-generated-document][data-generated-document] [data-document-watermark] {
        top: 0; bottom: auto; left: 0; width: 20px; height: 20px;
      }
      body:has([data-generated-document]) [data-generated-document][data-generated-document] [data-document-columns],
      body:has([data-generated-document]) [data-generated-document][data-generated-document] .pub-spread { gap: 24px !important; }
      body:has([data-generated-document]) [data-generated-document][data-generated-document] .pub-spread > * {
        padding-left: 0 !important; padding-right: 0 !important; border-left: 0 !important;
      }
    }
  `}</style>;
}
