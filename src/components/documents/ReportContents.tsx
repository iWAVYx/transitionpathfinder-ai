import type { ReportContentsItem } from "@/lib/report-contents";

/** One readable contents list for generated and age-aware sample reports. */
export function ReportContents({ items }: { items: ReportContentsItem[] }) {
  if (!items.length) return null;
  return (
    <nav
      aria-label="Table of contents"
      className="no-print print:hidden mt-10 border-t border-[color:var(--pub-rule-soft,theme(colors.border))] pt-6"
    >
      <div className="flex items-baseline justify-between border-b border-dotted border-[color:var(--pub-rule-soft,theme(colors.border))] pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Contents
        </p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {items.length} sections
        </p>
      </div>
      <ol className="grid gap-x-10 gap-y-1 pt-4 sm:grid-cols-2">
        {items.map((it, i) => (
          <li key={it.id} className="flex items-baseline gap-3 text-sm">
            <span className="font-mono text-[11px] tabular-nums text-primary/80">
              {String(i + 1).padStart(2, "0")}
            </span>
            <a
              href={`#${it.id}`}
              className="group flex flex-1 items-baseline gap-2 py-1 text-foreground/85 transition-colors hover:text-foreground"
            >
              <span className="min-w-0 break-words">{it.label}</span>
              <span aria-hidden className="flex-1 translate-y-[-2px] border-b border-dotted border-border/60" />
              <span aria-hidden className="font-mono text-[10px] text-muted-foreground">→</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
