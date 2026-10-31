import { SampleDocumentNotice } from "./SampleDocumentNotice";
import { ReportBrochurePrintStyles } from "./ReportBrochurePrintStyles";
import { DocumentWatermark } from "./DocumentWatermark";
import { DocumentViewStyles } from "./DocumentViewStyles";
import { DocumentPrintHeader } from "./DocumentPrintHeader";

/** Same document branding, readable type and print rules for live and sample reports. */
export function PathwayDocumentPresentation({ sample = false }: { sample?: boolean }) {
  return <>
    <DocumentWatermark />
    <DocumentViewStyles />
    <ReportBrochurePrintStyles />
    <DocumentPrintHeader title="Pathway Report" />
    {sample && <SampleDocumentNotice />}
  </>;
}
