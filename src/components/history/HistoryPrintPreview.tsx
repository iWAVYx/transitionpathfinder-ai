import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { HistoryExportRecords } from "@/lib/audit.functions";
import type { HistoryExportContext } from "@/lib/history-export";
import { HistoryDocument } from "./HistoryDocument";
export type PreparedHistory = {
  records: HistoryExportRecords;
  context: HistoryExportContext;
  printNow?: boolean;
};
export function HistoryPrintPreview({
  prepared,
  busy,
  failed,
  onClose,
  onPrint,
}: {
  prepared: PreparedHistory;
  busy: boolean;
  failed: boolean;
  onClose: () => void;
  onPrint: () => void;
}) {
  const [printing, setPrinting] = useState(false);
  const [printFailure, setPrintFailure] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setPrintFailure(false);
    setPrinting(!!prepared.printNow);
    if (!prepared.printNow) return;
    let active = true;
    void (async () => {
      try {
        await document.fonts?.ready;
        await Promise.all(
          Array.from(root.current?.querySelectorAll("img") ?? []).map((image) => image.decode()),
        );
        if (active && root.current?.isConnected) window.print();
      } catch {
        if (active) setPrintFailure(true);
      } finally {
        if (active) setPrinting(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [prepared]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        ref={root}
        data-history-print-preview
        className="max-h-[90vh] w-[94vw] max-w-4xl overflow-y-auto p-4 sm:p-6"
      >
        <div>
          <DialogTitle>Activity History Preview</DialogTitle>
          <DialogDescription className="mt-2">
            Review the selected loaded records, then print or save this document as PDF.
          </DialogDescription>
        </div>
        <div>
          <Button disabled={busy || printing} onClick={onPrint}>
            {busy
              ? "Checking Activity Access…"
              : printing
                ? "Preparing Print…"
                : "Print or Save as PDF"}
          </Button>
          {(failed || printFailure) && (
            <p role="alert" className="mt-2 text-sm">
              Activity could not be prepared. Please try again.
            </p>
          )}
        </div>
        <HistoryDocument records={prepared.records} context={prepared.context} />
      </DialogContent>
    </Dialog>
  );
}
