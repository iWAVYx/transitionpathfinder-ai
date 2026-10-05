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
  `}</style></>;
}
