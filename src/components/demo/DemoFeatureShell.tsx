import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Circle,
  Sparkles,
  Link2,
  Database,
  Target,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/title-case";
import {
  demoRoleDashboardLabel,
  demoRoleDashboardPath,
  type DemoFeatureDetail,
  type DemoRole,
} from "@/lib/demo/feature-routes";

/**
 * Dedicated demo feature page shell. Mirrors the same visual contract
 * as the drawer's ReadyBody but as a full page, with "Back to {role}
 * Dashboard" navigation and a Sample-data badge. The optional
 * `richModule` slot lets us drop in the real signed-in feature module
 * (e.g. StudentVoiceModule, IepTranslatorCard) above the generic body
 * so demo visitors interact with the same component signed-in users do.
 */
export function DemoFeatureShell({
  role,
  detail,
  richModule,
}: {
  role: DemoRole;
  detail: DemoFeatureDetail;
  richModule?: React.ReactNode;
}) {
  const backTo = demoRoleDashboardPath(role);
  const backLabel = demoRoleDashboardLabel(role);

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <div className="flex items-center justify-between gap-3">
          <Breadcrumbs
            trail={[
              { label: "Demo", to: "/demo" },
              { label: backLabel, to: backTo },
              { label: detail.title },
            ]}
          />
          <Link
            to={backTo as never}
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background/70 px-3.5 py-2 text-sm font-medium text-foreground/80 transition hover:bg-background hover:text-foreground"
            data-testid="back-to-role-dashboard"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to {backLabel}
          </Link>
        </div>

        <header className="mt-6 rounded-3xl border bg-gradient-hero p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span>{toTitleCase(detail.eyebrow)}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample data
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {toTitleCase(detail.title)}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {detail.summary}
          </p>
        </header>

        {richModule && <div className="mt-8">{richModule}</div>}

        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            {detail.stats && detail.stats.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Preview
              </h2>
              <ul className="mt-2 divide-y divide-border rounded-2xl border bg-card">
                {detail.rows.map((r, i) => (
                  <FeatureRowItem key={i} row={r} />
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-3">
            <MetaCard icon={Database} label="Data source" value={detail.dataSource} />
            <MetaCard icon={Target} label="What you can do" value={detail.what} />
            <MetaCard
              icon={Link2}
              label="Connects to"
              value={detail.connectsTo.join(" · ")}
            />
          </aside>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 p-5">
          <div>
            <p className="text-sm text-muted-foreground">
              This is a demo preview using sample data. In your workspace this
              page shows live info from your team.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={backTo as never}>
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
                Back to {backLabel}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/get-started">
                Get Started
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

function FeatureRowItem({
  row,
}: {
  row: DemoFeatureDetail["rows"][number];
}) {
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
    <li className="flex items-start gap-3 p-4">
      <StatusIcon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} aria-hidden />
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
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden /> {label}
      </div>
      <p className="mt-1.5 text-sm leading-snug text-foreground">{value}</p>
    </div>
  );
}
