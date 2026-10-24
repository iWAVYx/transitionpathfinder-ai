import type { HistoryExportRecords } from "@/lib/audit.functions";
import {
  historyCategoryLabel,
  historyTimestamp,
  historyWorkspaceLabel,
  type HistoryExportContext,
} from "@/lib/history-export";
import { classifyEntry, humanizeAction } from "@/lib/history-display";
import { DocumentPrintHeader } from "@/components/documents/DocumentPrintHeader";
import { DocumentWatermark } from "@/components/documents/DocumentWatermark";
import { DocumentPrintStyles } from "@/components/documents/DocumentPrintStyles";

/** Same limited, verified projection for screen preview and native print/PDF. */
export function HistoryDocument({
  records,
  context,
}: {
  records: HistoryExportRecords;
  context: HistoryExportContext;
}) {
  const studentName = [records.student.first_name, records.student.last_name]
    .filter(Boolean)
    .join(" ");
  return (
    <article
      data-history-document
      data-print-document
      data-generated-document
      className="history-document"
    >
      <DocumentPrintStyles />
      <DocumentWatermark />
      <style>{`
      .history-document { color:#242a33; background:white; padding:1.25rem; font-size:1rem; line-height:1.5; overflow-wrap:anywhere; }
      .history-document h1 { font-family:Georgia,serif; font-size:1.65rem; line-height:1.2; margin:0 0 .35rem; }
      .history-document h2, .history-document .history-band { font-family:Georgia,serif; font-weight:600; font-size:1.15rem; text-align:left; color:#512875; background:#f7f2fa; border-left:3px solid #6b3a91; padding:.45rem .65rem; margin:1rem 0 .6rem; }
      .history-document p { margin:.35rem 0; }
      .history-document .history-facts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.55rem 1rem; margin:.6rem 0; }
      .history-document .history-facts div { border-bottom:1px solid #e2dbe9; padding:.35rem 0; }
      .history-document dt { font-weight:600; } .history-document dd { margin:0; }
      .history-document table { width:100%; table-layout:fixed; border-collapse:collapse; }
      .history-document th,.history-document td { padding:.55rem .65rem; border:1px solid #e2dbe9; vertical-align:top; text-align:left; overflow-wrap:anywhere; }
      .history-document th { background:#faf8fc; font-weight:600; }
      .history-document td dl { margin:0; } .history-document td dt,.history-document td dd { display:inline; } .history-document td dt::after { content:": "; } .history-document td dl div + div { margin-top:.35rem; }
      .history-document .history-sample { padding:.5rem .65rem; border:1px solid #bca6ce; margin:.75rem 0; }
      @media print {
        body:has([data-history-document]) > :not(:has([data-history-document])) { display:none !important; }
        [data-history-print-preview] { display:block !important; position:static !important; inset:auto !important; transform:none !important; translate:none !important; rotate:none !important; scale:none !important; animation:none !important; width:auto !important; max-width:none !important; max-height:none !important; overflow:visible !important; border:0 !important; padding:0 !important; margin:0 !important; box-shadow:none !important; }
        [data-history-print-preview] > :not([data-history-document]) { display:none !important; }
        [data-history-document] { font:12pt/1.45 Arial,sans-serif; padding:0 !important; }
        [data-history-document] h1 { font-size:24pt; } [data-history-document] h2, [data-history-document] .history-band { font-size:16pt; }
        [data-history-document] [data-document-print-header] p { font-size:12pt; }
        [data-history-document] thead { display:table-header-group; } [data-history-document] tr { break-inside:avoid; }
        [data-history-document] .history-facts div, [data-history-document] .history-sample { break-inside:avoid; }
        [data-history-document] th,[data-history-document] td { padding:.07in .08in; }
        [data-history-document] .history-band { padding-right:.32in; }
        [data-history-document] [data-document-watermark] { top:0; right:0; }
      }
    `}</style>
      <DocumentPrintHeader title="Selected Activity Records" />
      <h1>Activity History</h1>
      <p>{studentName}</p>
      {context.sample && (
        <p className="history-sample">
          <strong>Fictional Sample</strong> - These dates, people and events are demonstration
          examples. This document contains no real student records.
        </p>
      )}
      <h2>About This Export</h2>
      <dl className="history-facts">
        {[
          ["Selected Category", historyCategoryLabel(context.filter)],
          ["Workspace Scope", historyWorkspaceLabel(records.workspace_scope)],
          ["Exported Records", String(records.entries.length)],
          ["Loaded Records", String(context.loadedCount)],
          ["Prepared At", historyTimestamp(context.exportedAt)],
          ["Older Activity Available When Loaded", context.olderAvailable ? "Yes" : "No"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>
        This document contains the selected category from the loaded view. It is not a complete
        lifetime activity record. Raw identifiers and private event details are excluded.
      </p>
      <p>
        Dates and times are shown in UTC. Recorded names and actors reflect the permitted records
        used to prepare this view.
      </p>
      <table aria-label="Recorded Activity">
        <colgroup>
          <col style={{ width: "40%" }} />
          <col style={{ width: "60%" }} />
        </colgroup>
        <thead>
          <tr>
            <th colSpan={2} className="history-band">
              Recorded Activity - {studentName}
            </th>
          </tr>
          <tr>
            <th scope="col">Activity</th>
            <th scope="col">Recorded Details</th>
          </tr>
        </thead>
        <tbody>
          {records.entries.map((entry, index) => (
            <tr key={index}>
              <td>{humanizeAction(entry).replace(/\u2014/g, "-")}</td>
              <td>
                <dl>
                  <div>
                    <dt>Recorded At</dt>
                    <dd>{historyTimestamp(entry.created_at)}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>
                      {classifyEntry(entry) === "all"
                        ? "Other Activity"
                        : historyCategoryLabel(classifyEntry(entry))}
                    </dd>
                  </div>
                  <div>
                    <dt>Recorded By</dt>
                    <dd>{entry.recorded_by}</dd>
                  </div>
                </dl>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
