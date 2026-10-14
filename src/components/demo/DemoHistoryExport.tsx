import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  HistoryPrintPreview,
  type PreparedHistory,
} from "@/components/history/HistoryPrintPreview";
import { createHistoryCsv, type HistoryExportContext } from "@/lib/history-export";
import { demoHistoryRecords } from "@/lib/demo/history-sample";
export function DemoHistoryExport({ displayName }: { displayName: string }) {
  const [prepared, setPrepared] = useState<PreparedHistory | null>(null);
  const records = demoHistoryRecords(displayName);
  const context = (): HistoryExportContext => ({
    filter: "all",
    loadedCount: 3,
    olderAvailable: false,
    exportedAt: new Date().toISOString(),
    sample: true,
  });
  return (
    <section className="rounded-xl border p-4" data-demo-history-export>
      <h2 className="font-semibold">Sample Activity Exports</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        These three fictional events use the same export layout as signed-in history. No account
        records are read or saved.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => {
            const csv = createHistoryCsv(records, context());
            const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = "transitionforward-fictional-activity.csv";
            document.body.appendChild(link);
            try {
              link.click();
            } finally {
              link.remove();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
            }
          }}
        >
          Download Sample Activity (CSV)
        </Button>
        <Button variant="outline" onClick={() => setPrepared({ records, context: context() })}>
          Preview Sample History
        </Button>
      </div>
      {prepared && (
        <HistoryPrintPreview
          prepared={prepared}
          busy={false}
          failed={false}
          onClose={() => setPrepared(null)}
          onPrint={() => setPrepared({ records, context: context(), printNow: true })}
        />
      )}
    </section>
  );
}
