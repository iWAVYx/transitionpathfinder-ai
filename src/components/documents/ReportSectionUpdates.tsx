import { useId, useState } from "react";
import { toTitleCase } from "@/lib/title-case";
import type { SectionHistoryRow } from "@/lib/report-section-history";

const date = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
/** Compact source history; a recorded save/generation never implies team approval. */
export function ReportSectionUpdates({ rows = [], sample = false }: { rows?: readonly SectionHistoryRow[]; sample?: boolean }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const known = !sample && rows.some(row => row.recordedAt);
  return <section data-report-section-updates aria-label="Section update history" className="report-section mt-6 border-y border-border/60 py-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <h2 className="font-display text-lg leading-snug">Section Update History</h2>
      {known && <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(value => !value)}
        className="no-print print:hidden rounded px-2 py-1 text-sm font-medium text-primary underline underline-offset-2 focus-visible:outline focus-visible:outline-2">
        {open ? "Hide Update Details" : "Show Update Details"}
      </button>}
    </div>
    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
      {sample ? "This sample has no saved section update history."
        : !known ? "Section update dates aren’t available in this view. Review the details with your team."
        : "These dates show when saved sections were generated or changed. Saved sections may include restored text. Confirm decisions with your team."}
    </p>
    {known && <div id={bodyId} data-report-update-body className={open ? "mt-3" : "mt-3 hidden print:block"}>
      <table data-report-update-table className="w-full table-fixed border-collapse text-left text-sm">
        <thead>
          <tr className="hidden print:table-row"><th colSpan={2} className="pb-2 text-left font-semibold">Section Update History · Dates in UTC</th></tr>
          <tr><th scope="col" className="w-1/2 border-b border-border/60 py-2 pr-3 font-semibold">Section</th><th scope="col" className="w-1/2 border-b border-border/60 py-2 pl-3 font-semibold">Last Recorded Update</th></tr>
        </thead>
        <tbody>{rows.map(row => <tr key={row.field} data-report-update-field={row.field}>
          <th scope="row" className="break-words border-b border-border/40 py-2 pr-3 align-top font-medium">{toTitleCase(row.label)}</th>
          <td className="border-b border-border/40 py-2 pl-3 align-top">
            {row.recordedAt ? <>{row.operation === "generated" ? "Generated" : "Saved"} · <time dateTime={row.recordedAt}>{date(row.recordedAt)}</time></> : "Update Date Unavailable"}
          </td>
        </tr>)}</tbody>
      </table>
      <p className="mt-2 text-sm text-muted-foreground">Dates are shown in UTC and describe saved report sections.</p>
    </div>}
    <style>{`[data-report-section-updates] th, [data-report-section-updates] td { text-align: left !important; }
    @media print {
      [data-report-section-updates] { margin-top: .12in !important; padding-top: .08in !important; padding-bottom: .08in !important; }
      [data-report-section-updates] [data-report-update-body] { display: block !important; }
      [data-report-section-updates] thead { display: table-header-group !important; }
      [data-report-section-updates] tr { break-inside: avoid !important; page-break-inside: avoid !important; }
      [data-report-section-updates] th, [data-report-section-updates] td { overflow-wrap: anywhere; }
    }`}</style>
  </section>;
}
