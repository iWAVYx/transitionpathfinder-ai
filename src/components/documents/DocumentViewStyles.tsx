import { DocumentLayoutStyles } from "./DocumentLayoutStyles";
/** Shared readable document presentation; screen and print use the same content. */
export function DocumentViewStyles() {
  return <><DocumentLayoutStyles /><style>{`
    [data-generated-document] { min-width: 0; text-align: left; overflow-wrap: anywhere; }
    [data-generated-document] p, [data-generated-document] li { line-height: 1.65; }
    [data-generated-document] h1, [data-generated-document] h2, [data-generated-document] h3 { text-wrap: balance; }
    [data-generated-document] [data-document-print-header] { display: block; }
    [data-generated-document] [data-document-print-header] img { max-width: 100%; object-fit: contain; }
    [data-generated-document] table { width: 100%; }
    [data-generated-document] [data-report-profile-details] {
      display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem;
    }
    [data-generated-document] [data-report-profile-group] {
      min-width: 0; padding: 0.75rem 0; border-bottom: 1px solid var(--pub-rule-soft);
    }
    [data-generated-document] [data-report-profile-group] h3 { margin: 0; }
    @media (min-width: 640px) {
      [data-generated-document] [data-report-profile-details] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    [data-generated-document] [data-report-readiness-row] { min-width: 0; }
    [data-generated-document] [data-report-readiness-heading],
    [data-generated-document] [data-demo-readiness-overall] {
      display: grid !important; grid-template-columns: minmax(0, 1fr) auto;
      align-items: start; gap: 0.75rem;
    }
    [data-generated-document] [data-report-readiness-heading] h3,
    [data-generated-document] [data-demo-readiness-overall] h3 { margin: 0; }
    [data-generated-document] [data-report-readiness-grid] { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }
    @media (min-width: 640px) {
      [data-generated-document] [data-report-readiness-grid] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    /* Repeated student answers share one text axis and even row spacing. */
    [data-generated-document] [data-report-voice-response] + [data-report-voice-response] { margin-top: 0.75rem; }
    [data-generated-document] [data-report-voice-response] .pub-pullquote {
      margin: 0; padding: 0.75rem 1rem;
    }
    [data-generated-document] [data-report-voice-response] blockquote {
      padding: 0; font-size: clamp(1.1rem, 2vw, 1.35rem); line-height: 1.45;
    }
    [data-generated-document] [data-report-voice-response] blockquote::before { display: none; }
    [data-generated-document] [data-report-voice-response] figcaption {
      margin: 0.5rem 0 0; font-size: 0.875rem; line-height: 1.4;
      text-transform: none; letter-spacing: normal;
    }
    /* Use the opaque, theme-aware text token instead of shell opacity mixing. */
    [data-generated-document][data-generated-document] .text-muted-foreground {
      color: var(--muted-foreground) !important;
    }
  `}</style></>;
}
