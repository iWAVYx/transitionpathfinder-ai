import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Circle,
  Sparkles,
  Link2,
  Database,
  Target,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toTitleCase } from "@/lib/title-case";
import {
  STUDENT_FEATURE_DETAILS,
  type StudentFeatureId,
  type FeatureRow,
} from "@/lib/demo/student/feature-details";

/**
 * StudentFeatureDrawer — one shared feature-detail drawer used by every
 * student dashboard tile (both signed-in and /demo/student). Renders a
 * focused preview of the feature: what it does, what data feeds it, the
 * next action, and the connections into the rest of the platform.
 *
 * The drawer is intentionally read-only. The "Open …" CTA routes the user
 * into the full workflow.
 */
export function StudentFeatureDrawer({
  featureId,
  icon,
  onOpenChange,
  isSample = false,
}: {
  featureId: StudentFeatureId | null;
  icon?: LucideIcon;
  onOpenChange: (open: boolean) => void;
  /** Route CTAs to demo equivalents when true. */
  isSample?: boolean;
}) {
  const detail = featureId ? STUDENT_FEATURE_DETAILS[featureId] : null;
  const Icon = icon;

  return (
    <Sheet open={!!detail} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        {detail && (
          <>
            <SheetHeader className="border-b bg-muted/30 px-6 py-5">
              <div className="flex items-center gap-3">
                {Icon && (
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {toTitleCase(detail.eyebrow)}
                  </p>
                  <SheetTitle className="text-left font-display text-xl">
                    {toTitleCase(detail.title)}
                  </SheetTitle>
                </div>
              </div>
              <SheetDescription className="text-left text-sm leading-relaxed">
                {detail.summary}
              </SheetDescription>
              {isSample && (
                <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
                  <Sparkles className="h-3 w-3" aria-hidden /> Sample data
                </span>
              )}
            </SheetHeader>

            <div className="flex-1 space-y-6 px-6 py-6">
              {detail.stats && detail.stats.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {detail.stats.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border bg-card p-3 text-center"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {s.label}
                      </p>
                      <p className="mt-1 font-display text-base leading-tight text-foreground">
                        {s.value ?? "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Preview
                </h3>
                <ul className="mt-2 divide-y divide-border rounded-xl border bg-card">
                  {detail.rows.map((r, i) => (
                    <FeatureRowItem key={i} row={r} />
                  ))}
                </ul>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <MetaCard
                  icon={Database}
                  label="Data source"
                  value={detail.dataSource}
                />
                <MetaCard
                  icon={Target}
                  label="What you can do"
                  value={detail.what}
                />
                <MetaCard
                  icon={Link2}
                  label="Connects to"
                  value={detail.connectsTo.join(" · ")}
                />
              </section>
            </div>

            <div className="sticky bottom-0 border-t bg-background/95 px-6 py-4 backdrop-blur">
              <Button asChild size="lg" className="w-full">
                <Link
                  to={
                    (isSample
                      ? sampleRoute(detail.primaryAction.to)
                      : detail.primaryAction.to) as string
                  }
                  onClick={() => onOpenChange(false)}
                >
                  {toTitleCase(
                    isSample ? `Preview ${detail.title}` : detail.primaryAction.label,
                  )}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FeatureRowItem({ row }: { row: FeatureRow }) {
  const StatusIcon =
    row.status === "ok"
      ? CheckCircle2
      : row.status === "warning" || row.status === "critical"
      ? AlertCircle
      : Circle;
  const tone =
    row.status === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : row.status === "critical"
      ? "text-destructive"
      : row.status === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground";
  return (
    <li className="flex items-start gap-3 p-3">
      <StatusIcon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{row.primary}</p>
        {row.secondary && (
          <p className="mt-0.5 text-xs text-muted-foreground">{row.secondary}</p>
        )}
      </div>
      {row.meta && (
        <span className="shrink-0 text-[11px] text-muted-foreground">{row.meta}</span>
      )}
    </li>
  );
}

function MetaCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden /> {label}
      </div>
      <p className="mt-1 text-sm leading-snug text-foreground">{value}</p>
    </div>
  );
}

/**
 * Best-effort mapping from signed-in feature route to the closest demo
 * page. If no demo equivalent exists, keep the signed-in route so the CTA
 * still lands somewhere useful.
 */
function sampleRoute(to: string): string {
  const map: Record<string, string> = {
    "/pathway/student": "/demo/report",
    "/student-voice": "/demo/voice",
    "/action-items": "/demo/next",
    "/resources/saved": "/demo/resources",
    "/ppt-prep": "/demo/meeting",
    "/meetings": "/demo/calendar",
    "/documents": "/demo/documents",
  };
  return map[to] ?? to;
}
