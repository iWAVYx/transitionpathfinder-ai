import { cn } from "@/lib/utils";

/**
 * ResponsiveTable — render rows as a real <table> at md+ and as stacked cards
 * under md. Lets dense admin tables stay scannable on mobile without sideways
 * scroll.
 *
 * Usage:
 *   <ResponsiveTable
 *     columns={[
 *       { key: "name", header: "Name", primary: true },
 *       { key: "status", header: "Status" },
 *       { key: "actions", header: "", align: "right" },
 *     ]}
 *     rows={items.map((it) => ({
 *       id: it.id,
 *       cells: {
 *         name: <span className="font-medium">{it.name}</span>,
 *         status: <Badge>{it.status}</Badge>,
 *         actions: <Button size="sm">Open</Button>,
 *       },
 *     }))}
 *   />
 */
export type ResponsiveColumn = {
  key: string;
  header: React.ReactNode;
  /** marks the field used as the card title on mobile */
  primary?: boolean;
  /** alignment of the table cell at md+ */
  align?: "left" | "right" | "center";
  /** hide this column from the mobile card view */
  hideOnMobile?: boolean;
  /** custom label override in the mobile card (defaults to header) */
  mobileLabel?: React.ReactNode;
};

export type ResponsiveRow = {
  id: string;
  cells: Record<string, React.ReactNode>;
  /** Optional row-level click handler (mobile card becomes tappable) */
  onClick?: () => void;
};

export function ResponsiveTable({
  columns,
  rows,
  empty,
  className,
}: {
  columns: ResponsiveColumn[];
  rows: ResponsiveRow[];
  empty?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className={cn("rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground", className)}>
        {empty ?? "Nothing to show."}
      </div>
    );
  }

  return (
    <>
      {/* Table view — md and up */}
      <div className={cn("hidden overflow-hidden rounded-2xl border bg-card shadow-soft md:block", className)}>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-4 py-2.5 font-medium",
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={cn("border-t", r.onClick ? "cursor-pointer hover:bg-muted/30" : "")}
                onClick={r.onClick}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-3 align-middle",
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                    )}
                  >
                    {r.cells[c.key] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card view — below md */}
      <ul className={cn("space-y-3 md:hidden", className)}>
        {rows.map((r) => {
          const primaryCol = columns.find((c) => c.primary);
          const otherCols = columns.filter((c) => !c.primary && !c.hideOnMobile);
          return (
            <li
              key={r.id}
              className={cn(
                "rounded-2xl border bg-card p-4 shadow-soft",
                r.onClick ? "cursor-pointer active:bg-muted/30" : "",
              )}
              onClick={r.onClick}
            >
              {primaryCol ? (
                <div className="text-sm font-medium">{r.cells[primaryCol.key]}</div>
              ) : null}
              {otherCols.length > 0 ? (
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  {otherCols.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {c.mobileLabel ?? c.header}
                      </dt>
                      <dd className="mt-0.5 truncate text-sm">{r.cells[c.key]}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
