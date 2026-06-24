import { DEMO_FEATURE_MAP, type DemoElementId } from "@/lib/demo/feature-map";
import { cn } from "@/lib/utils";

interface FeatureFootnoteProps {
  elementId: DemoElementId;
  className?: string;
}

const STATUS_LABEL: Record<string, string> = {
  live: "Available now",
  partial: "Available — expanding",
  "future-phase": "Future phase",
};

const STATUS_CLASS: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  partial: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "future-phase": "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
};

/**
 * Renders a small "Where this lives in the product" disclosure under a demo
 * panel. Pulls all copy from DEMO_FEATURE_MAP so the demo cannot drift out of
 * sync with the audit registry.
 */
export function FeatureFootnote({ elementId, className }: FeatureFootnoteProps) {
  const entry = DEMO_FEATURE_MAP[elementId];
  if (!entry) return null;

  return (
    <details
      className={cn(
        "mt-4 rounded-md border border-border/60 bg-muted/30 text-sm",
        className,
      )}
    >
      <summary className="cursor-pointer select-none px-3 py-2 text-muted-foreground hover:text-foreground">
        Where this lives in the product
        <span
          className={cn(
            "ml-2 inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
            STATUS_CLASS[entry.status],
          )}
        >
          {STATUS_LABEL[entry.status]}
        </span>
      </summary>
      <dl className="grid gap-2 px-3 pb-3 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-foreground">Product feature</dt>
          <dd>{entry.product}</dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">Lives at</dt>
          <dd className="break-all">{entry.livesAt}</dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">Roles</dt>
          <dd>{entry.roles.join(", ")}</dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">Data source</dt>
          <dd>{entry.dataSource}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-semibold text-foreground">Next action</dt>
          <dd>{entry.nextAction}</dd>
        </div>
        {entry.notes ? (
          <div className="sm:col-span-2">
            <dt className="font-semibold text-foreground">Note</dt>
            <dd>{entry.notes}</dd>
          </div>
        ) : null}
      </dl>
    </details>
  );
}
