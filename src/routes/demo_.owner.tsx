import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Activity, ClipboardList, Users, Wrench } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { LaunchReadinessBoard } from "@/components/platform/LaunchReadinessBoard";
import {
  CommandMetricStrip,
  CommandRows,
  CommandZone,
} from "@/components/dashboard/CommandCenter";
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
  const featureRows = OWNER_FEATURE_ORDER.map((id) => {
    const d = OWNER_FEATURE_DETAILS[id];
    const risk = d.rows.some((row) => row.status === "critical");
    const warn = d.rows.some((row) => row.status === "warning");
    return {
      icon: id === "analytics" ? Activity : id === "role-audit" ? Users : Wrench,
      label: d.title,
      detail: d.summary,
      status: risk ? "Blocker" : warn ? "Attention" : d.stats?.[0]?.value ?? d.eyebrow,
      tone: risk ? "risk" as const : warn ? "warn" as const : "neutral" as const,
      to: `/demo/feature/owner/${id}`,
    };
  });

  return (
    <SiteShell>
      <div className="container max-w-6xl space-y-7 py-8">
        <Breadcrumbs
          trail={[{ label: "Demo", to: "/demo" }, { label: "Owner Hub" }]}
        />

        <div className="flex items-start gap-3 border-l-2 border-primary/40 bg-primary/5 py-3 pl-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
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

        <header className="border-b border-border/70 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Platform Admin · Sample Data</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Owner Hub
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Operational health, review queues, role readiness, and support/compliance surfaces.
          </p>
        </header>

        <CommandMetricStrip
          items={[
            { label: "Operational Surfaces", value: OWNER_FEATURE_ORDER.length, hint: "Admin work areas" },
            { label: "Queues Flagged", value: 2, hint: "Testing + role audit", tone: "warn" },
            { label: "Health", value: "99.97%", hint: "30d uptime", tone: "success" },
            { label: "Pilots", value: 6, hint: "2 onboarding" },
          ]}
        />

        <section aria-label="Workspace" className="border-y border-primary/25 bg-primary/[0.035] py-5 sm:py-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b border-primary/15 pb-3">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary">Workspace</p>
              <h2 className="font-display text-lg tracking-tight">Launch Readiness Board</h2>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Primary work area</span>
          </div>
          <div data-preserve-workspace-internals>
            <LaunchReadinessBoard />
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <CommandZone eyebrow="Operations" title="Admin Surfaces">
            <div data-testid="demo-owner-tile-list">
              <CommandRows rows={featureRows} />
            </div>
          </CommandZone>
          <CommandZone eyebrow="Support / Compliance" title="Queues And Readiness">
            <CommandRows
              rows={[
                { icon: ClipboardList, label: "Testing Scripts", detail: "Release-readiness pass/fail evidence.", status: "2 blocked", tone: "risk", to: "/demo/feature/owner/testing" },
                { icon: Activity, label: "System Diagnostics", detail: "Queue depth, jobs, integrations, and error rates.", status: "Healthy", tone: "success", to: "/demo/feature/owner/diagnostics" },
                { icon: Users, label: "Role Audit", detail: "Privileged role changes and pending invitations.", status: "Review", tone: "warn", to: "/demo/feature/owner/role-audit" },
              ]}
            />
          </CommandZone>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/70 pt-5">
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
