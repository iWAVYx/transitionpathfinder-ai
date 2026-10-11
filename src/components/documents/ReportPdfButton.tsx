import { useEffect, useRef, type ComponentProps } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { printPathwayReport } from "@/lib/report-print";

export function ReportPdfButton({ size, className }: Pick<ComponentProps<typeof Button>, "size" | "className">) {
  const cancel = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => cancel.current?.(), []);
  return <Button
    size={size}
    className={className}
    onClick={() => { cancel.current?.(); cancel.current = printPathwayReport(); }}
    aria-label="Print or save Pathway Report as PDF"
    title="Opens your print dialog. Choose Save as PDF to download this report."
  ><Download className="h-4 w-4" /> Print or Save as PDF</Button>;
}
