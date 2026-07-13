import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LaunchReadinessBoard } from "@/components/platform/LaunchReadinessBoard";
import {
  OWNER_FEATURE_DETAILS,
  OWNER_FEATURE_ORDER,
} from "@/lib/demo/owner/feature-details";

/**
 * Public demo page mirroring the signed-in Owner Hub. Each tile
 * previews an Owner surface with sample data and links into the
 * dedicated /demo/feature/owner/<slug> page — same structure the
 * other role demos use.
 */
export const Route = createFileRoute("/demo_/owner")({
  head: () => ({
    meta: [
      { title: "Owner Hub Preview — TransitionForward Demo" },
      {
        name: "description",
        content:
          "Preview the Platform Owner / Admin Hub with sample data — testing, diagnostics, role audit, content, demo tenants, activity log, analytics, and pilot packages.",
      },
      { name: "robots", content: "noindex" },
      {
        property: "og:title",
        content: "Owner Hub Preview — TransitionForward Demo",
      },
      {
        property: "og:description",
        content:
          "Sample-data preview of every Owner Hub surface — no real tenant data.",
      },
    ],
  }),
  component: DemoOwnerPage,
});

function DemoOwnerPage() {
  return (
    <SiteShell>
      <div className="container max-w-6xl py-8 space-y-6">
        <Breadcrumbs
          trail={[{ label: "Demo", to: "/demo" }, { label: "Owner Hub" }]}
        />

        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <div className="font-semibold">
              You're previewing the Platform Owner Hub
            </div>
            <p className="text-muted-foreground">
              Sample data only. The real Owner Hub is restricted to Platform
              Admins and never exposes tenant PII in demo mode.
            </p>
          </div>
        </div>

        <header className="rounded-3xl border bg-gradient-hero p-6 shadow-soft">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span>Platform Admin</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample data
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Owner Hub
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Operational surfaces for keeping TransitionForward healthy — testing,
            diagnostics, role governance, content, demo tenants, activity, analytics,
            and pilot packages. Each tile opens a dedicated preview.
          </p>
        </header>

        <LaunchReadinessBoard />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OWNER_FEATURE_ORDER.map((id) => {
            const d = OWNER_FEATURE_DETAILS[id];
            return (
              <article
                key={id}
                className="flex flex-col rounded-2xl border bg-card p-5 shadow-soft"
                data-testid={`demo-owner-tile-${id}`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {d.eyebrow}
                </p>
                <h2 className="mt-1 font-display text-lg leading-tight">
                  {d.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {d.summary}
                </p>
                {d.stats && d.stats.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {d.stats.slice(0, 3).map((s) => (
                      <Badge key={s.label} variant="outline" className="text-[10px]">
                        {s.label}: {s.value ?? "—"}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-auto pt-4">
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link to="/demo/feature/$role/$slug" params={{ role: "owner", slug: id }}>
                      Open Preview <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="rounded-xl border bg-card p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold">Ready to run the real Owner Hub?</h3>
            <p className="text-sm text-muted-foreground">
              Sign in as a Platform Admin to access live testing scripts,
              diagnostics, and audit trails.
            </p>
          </div>
          <Button asChild>
            <Link to="/owner">
              Open Owner Hub <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
