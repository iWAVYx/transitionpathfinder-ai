import { BRAND_ICON_SRC } from "@/components/brand/BrandLogo";

/** Small decorative approved mark; only exported pages display it. */
export function DocumentWatermark() {
  return <>
    <style>{`
      [data-document-watermark] { display: none; }
      @media print {
        [data-document-watermark] {
          display: block !important; visibility: visible !important;
          position: fixed; left: 0; bottom: 0;
          width: 28px; height: 28px; opacity: 0.09;
          pointer-events: none; user-select: none;
          print-color-adjust: exact; -webkit-print-color-adjust: exact;
        }
        .report-root [data-document-watermark] { bottom: 0.15in; left: 0.15in; }
      }
    `}</style>
    <img data-document-watermark src={BRAND_ICON_SRC} width={28} height={28} alt="" aria-hidden="true" />
  </>;
}
