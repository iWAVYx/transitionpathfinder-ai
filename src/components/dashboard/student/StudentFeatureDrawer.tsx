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
  Inbox,
  Lock,
  Loader2,
  RefreshCw,
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
import { resolveDemoFeatureRoute } from "@/lib/demo/feature-routes";
import {
  STUDENT_FEATURE_DETAILS,
  type StudentFeatureId,
  type FeatureRow,
} from "@/lib/demo/student/feature-details";

/**
 * Shared drawer for the Student dashboard. Mirrors the Parent / Educator /
 * School Admin drawer contract: loading · error · permission · empty · ready.
 */
export type StudentFeatureState =
  | "loading"
  | "error"
  | "permission"
  | "empty"
  | "ready";

export function StudentFeatureDrawer({
  featureId,
  icon,
  onOpenChange,
  isSample = false,
  state = "ready",
  onRetry,
}: {
  featureId: StudentFeatureId | null;
  icon?: LucideIcon;
  onOpenChange: (open: boolean) => void;
  isSample?: boolean;
  state?: StudentFeatureState;
  onRetry?: () => void;
}) {
  const detail = featureId ? STUDENT_FEATURE_DETAILS[featureId] : null;
  const Icon = icon;

  return (
    <Sheet open={!!detail} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto overscroll-contain p-0 sm:max-w-lg"
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
              {state === "loading" && <LoadingBody />}
              {state === "error" && <ErrorBody onRetry={onRetry} />}
              {state === "permission" && (
                <PermissionBody featureTitle={detail.title} />
              )}
              {state === "empty" && (
                <EmptyBody
                  headline={detail.emptyHeadline}
                  body={detail.emptyBody}
                  connectsTo={detail.connectsTo}
                />
              )}
              {state === "ready" && <ReadyBody detail={detail} />}
            </div>

            <div className="sticky bottom-0 border-t bg-background/95 px-6 py-4 backdrop-blur">
              <Button
                asChild={state !== "loading" && state !== "permission"}
                size="lg"
                className="w-full"
                disabled={state === "loading" || state === "permission"}
                aria-disabled={state === "loading" || state === "permission"}
              >
                {state === "loading" || state === "permission" ? (
                  <span className="inline-flex items-center gap-1.5">
                    {state === "loading" && (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    )}
                    {state === "loading" ? "Loading…" : "Access needed"}
                  </span>
                ) : (
                  <Link
                    to={
                      (isSample
                        ? resolveDemoFeatureRoute("student", detail.id)
                        : detail.primaryAction.to) as string
                    }
                    onClick={() => onOpenChange(false)}
                  >
                    {toTitleCase(
                      isSample ? `Preview ${detail.title}` : detail.primaryAction.label,
                    )}
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                  </Link>
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ReadyBody({
  detail,
}: {
  detail: (typeof STUDENT_FEATURE_DETAILS)[StudentFeatureId];
}) {
  return (
    <>
      {detail.stats && detail.stats.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {detail.stats.map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-3 text-center">
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
        <MetaCard icon={Database} label="Data source" value={detail.dataSource} />
        <MetaCard icon={Target} label="What you can do" value={detail.what} />
        <MetaCard
          icon={Link2}
          label="Connects to"
          value={detail.connectsTo.join(" · ")}
        />
      </section>
    </>
  );
}

function LoadingBody() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-3">
            <div className="h-3 w-16 animate-pulse rounded bg-muted-foreground/15" />
            <div className="mt-2 h-5 w-12 animate-pulse rounded bg-muted-foreground/20" />
          </div>
        ))}
      </div>
      <ul className="divide-y divide-border rounded-xl border bg-card">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-3 p-3">
            <div className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-muted-foreground/20" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted-foreground/20" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted-foreground/15" />
            </div>
          </li>
        ))}
      </ul>
      <p className="text-center text-xs text-muted-foreground">
        <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden /> Loading
      </p>
      <span className="sr-only">Loading feature details</span>
    </div>
  );
}

function ErrorBody({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center"
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-3 font-display text-base font-medium">
        We couldn't load this right now.
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Your info is safe. Try again, or open the full page.
      </p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onRetry}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Try Again
        </Button>
      )}
    </div>
  );
}

function PermissionBody({ featureTitle }: { featureTitle: string }) {
  return (
    <div className="rounded-2xl border bg-muted/30 p-5 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Lock className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-3 font-display text-base font-medium">
        Ask your team to share {toTitleCase(featureTitle)}.
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        This isn't shared with you yet. Ask your case manager or family to open it up.
      </p>
    </div>
  );
}

function EmptyBody({
  headline,
  body,
  connectsTo,
}: {
  headline: string;
  body: string;
  connectsTo: string[];
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-6 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Inbox className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-3 font-display text-base font-medium">{headline}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {connectsTo.length > 0 && (
        <p className="mt-4 text-[11px] uppercase tracking-wider text-muted-foreground">
          Connects to: {connectsTo.join(" · ")}
        </p>
      )}
    </div>
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

