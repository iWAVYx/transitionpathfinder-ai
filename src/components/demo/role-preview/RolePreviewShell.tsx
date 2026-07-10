import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Shield,
  CheckCircle2,
  Wrench,
  Target,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import type { DemoRolePreview } from "@/lib/demo/role-previews";
import {
  DEMO_ROLES,
  DEMO_ROLE_ORDER,
  SHARED_DEMO_STUDENT,
} from "@/lib/demo/role-previews";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/layout/PageSection";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { DemoToolPreviewCard, DemoToolPreviewGrid } from "./DemoToolPreviewCard";
import { renderDemoPreview } from "@/components/demo/previews";

/**
 * Sticky role selector — appears on every /demo/<role> page so a visitor
 * can hop between role previews without going back to the hub.
 */
export function RoleNavChips({ current }: { current: DemoRolePreview["id"] }) {
  return (
    <nav
      aria-label="Preview by role"
      className="sticky top-16 z-30 -mx-4 border-b bg-background/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Preview by role
        </span>
        {DEMO_ROLE_ORDER.map((id) => {
          const role = DEMO_ROLES[id];
          const active = id === current;
          return (
            <Link
              key={id}
              to={role.path}
              className={
                active
                  ? "rounded-full border border-primary bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                  : "rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:border-primary/60 hover:text-primary"
              }
              aria-current={active ? "page" : undefined}
            >
              {role.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function RolePreviewShell({
  role,
  extras,
}: {
  role: DemoRolePreview;
  /** Optional role-specific content rendered after the Dashboard Preview section. */
  extras?: React.ReactNode;
}) {
  const Icon = role.icon;
  const next = role.next ? DEMO_ROLES[role.next] : null;

  return (
    <SiteShell>
      <PageSection spacing="tight">
        <Breadcrumbs
          trail={[
            { label: "Demo", to: "/demo" },
            { label: `${role.label} Preview` },
          ]}
        />
      </PageSection>

      <PageSection spacing="none">
        <RoleNavChips current={role.id} />
      </PageSection>

      {/* HERO */}
      <PageSection spacing="tight">
        <div className="rounded-3xl border-2 border-dashed border-primary/30 bg-gradient-hero p-6 shadow-soft sm:p-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <Badge variant="outline" className="border-primary text-primary">
                  {role.label} · Demo
                </Badge>
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                {role.tagline}
              </p>
              <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
                {role.headline}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                {role.intro}
              </p>
            </div>

            <aside className="rounded-2xl border bg-background/80 p-5 text-sm shadow-soft">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Sample data only
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Nothing here is a real student, caseload, or organization.
                {role.sharedStudent
                  ? " Student, Family, and Educator previews share one fictional student:"
                  : " Everything shown is illustrative."}
              </p>
              {role.sharedStudent && (
                <div className="mt-3 rounded-xl border bg-card p-3">
                  <p className="font-semibold">{SHARED_DEMO_STUDENT.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {SHARED_DEMO_STUDENT.pronouns} · Grade {SHARED_DEMO_STUDENT.grade} ·{" "}
                    {SHARED_DEMO_STUDENT.school}
                  </p>
                  <blockquote className="mt-2 border-l-2 border-primary/40 pl-2 text-xs italic text-foreground/80">
                    &ldquo;{SHARED_DEMO_STUDENT.quote}&rdquo;
                  </blockquote>
                </div>
              )}
            </aside>
          </div>
        </div>
      </PageSection>

      {/* DASHBOARD PREVIEW — the centerpiece */}
      <PageSection>
        <SectionHeading
          index="01"
          eyebrow="Dashboard preview"
          title={
            <span className="inline-flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              What this role sees at sign-in
            </span>
          }
          description="Every tool below appears on the real signed-in dashboard for this role. Sample data only — no real students or organizations."
          actions={
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample data
            </span>
          }
        />

        {/* At-a-glance strip */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {role.dashboardTiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl border bg-card p-4 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {tile.label}
              </p>
              <p className="mt-2 font-display text-2xl leading-tight">{tile.value}</p>
              {tile.hint && (
                <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
              )}
            </div>
          ))}
        </div>

        <DemoToolPreviewGrid>
          {role.toolPreviews.map((t) => (
            <DemoToolPreviewCard
              key={t.title}
              icon={t.icon}
              title={t.title}
              status={t.status}
              tone={t.tone}
              summary={t.summary}
              bullets={t.bullets}
              cta={t.cta}
              footer={t.previewId ? renderDemoPreview(t.previewId) : undefined}
            />
          ))}
        </DemoToolPreviewGrid>
      </PageSection>

      {extras ? <PageSection spacing="tight">{extras}</PageSection> : null}



      {/* VALUE STRIP */}
      <PageSection spacing="tight">
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <SectionHeading
            index="02"
            eyebrow="Value"
            title="What this role gets"
            size="sm"
            className="mb-4"
          />
          <ul className="grid gap-3 sm:grid-cols-3">
            {role.valueBullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2 rounded-xl bg-background p-3 text-sm"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="italic">&ldquo;{b}&rdquo;</span>
              </li>
            ))}
          </ul>
        </div>
      </PageSection>

      {/* TOOLS · ACTIONS · OUTPUTS */}
      <PageSection spacing="tight">
        <SectionHeading
          index="03"
          eyebrow="Under the hood"
          title="Tools, actions, outputs"
          size="sm"
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <TripleCard
            icon={<Wrench className="h-4 w-4" />}
            title="Key tools"
            items={role.tools}
          />
          <TripleCard
            icon={<Target className="h-4 w-4" />}
            title="Actions this role can take"
            items={role.actions}
          />
          <TripleCard
            icon={<FileText className="h-4 w-4" />}
            title="Outputs they receive"
            items={role.outputs}
          />
        </div>
      </PageSection>

      {/* BOUNDARY (partner) */}
      {role.boundary && (
        <PageSection spacing="tight">
          <div className="rounded-3xl border-2 border-amber-500/40 bg-amber-50 p-6 dark:bg-amber-950/20 sm:p-8">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
              <div className="min-w-0">
                <h2 className="font-display text-lg text-amber-900 dark:text-amber-200">
                  {role.boundary.title}
                </h2>
                <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
                  This role does not have access to any of the following:
                </p>
                <ul className="mt-3 grid gap-2 text-sm text-amber-900 dark:text-amber-100 sm:grid-cols-2">
                  {role.boundary.items.map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-700 dark:bg-amber-400" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </PageSection>
      )}

      {/* CTA */}
      <PageSection spacing="tight">
        <div className="rounded-3xl border bg-gradient-hero p-6 shadow-soft sm:p-8">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <h2 className="font-display text-2xl">Ready to take the next step?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Join the waitlist, request a pilot, or keep exploring how each role fits together.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button asChild size="lg">
                <Link to={role.ctaPrimary.to}>
                  {role.ctaPrimary.label}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              {role.ctaSecondary && (
                <Button asChild size="lg" variant="outline">
                  <Link to={role.ctaSecondary.to}>{role.ctaSecondary.label}</Link>
                </Button>
              )}
              <Button asChild size="lg" variant="ghost">
                <Link to="/waitlist">Join the waitlist</Link>
              </Button>
            </div>
          </div>
        </div>
      </PageSection>

      {/* CONTINUE THE TOUR */}
      {next && (
        <PageSection spacing="tight">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
            <span className="text-sm text-muted-foreground">Continue the tour</span>
            <Button asChild variant="ghost" size="sm">
              <Link to={next.path}>
                Next: {next.label} preview <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </PageSection>
      )}
    </SiteShell>
  );
}

function TripleCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="flex h-full flex-col rounded-3xl border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <span className="text-primary">{icon}</span>
        <h3 className="font-display text-base">{title}</h3>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
