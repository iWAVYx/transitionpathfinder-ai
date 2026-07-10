import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Shield, CheckCircle2, Wrench, Target, FileText, LayoutDashboard } from "lucide-react";
import type { DemoRolePreview } from "@/lib/demo/role-previews";
import { DEMO_ROLES, DEMO_ROLE_ORDER, SHARED_DEMO_STUDENT } from "@/lib/demo/role-previews";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoToolPreviewCard, DemoToolPreviewGrid } from "./DemoToolPreviewCard";

/**
 * Sticky role selector — appears on every /demo/<role> page so a visitor
 * can hop between role previews without going back to the hub.
 */
export function RoleNavChips({ current }: { current: DemoRolePreview["id"] }) {
  return (
    <nav
      aria-label="Preview by role"
      className="sticky top-16 z-30 -mx-4 mb-6 border-b bg-background/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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

export function RolePreviewShell({ role }: { role: DemoRolePreview }) {
  const Icon = role.icon;
  const next = role.next ? DEMO_ROLES[role.next] : null;

  return (
    <SiteShell>
      <div className="container max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "Demo", to: "/demo" },
            { label: `${role.label} Preview` },
          ]}
        />

        <RoleNavChips current={role.id} />

        {/* HERO */}
        <section className="rounded-3xl border-2 border-dashed border-primary/30 bg-gradient-hero p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <Badge variant="outline" className="border-primary text-primary">
                  {role.label} · Demo
                </Badge>
              </div>
              <h1 className="mt-4 font-display text-3xl tracking-tight sm:text-4xl">
                {role.headline}
              </h1>
              <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {role.tagline}
              </p>
              <p className="mt-3 text-base text-muted-foreground">{role.intro}</p>
            </div>

            <aside className="w-full max-w-sm rounded-2xl border bg-background/80 p-4 text-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Sample data only
              </div>
              <p className="mt-2 text-muted-foreground">
                Nothing here is a real student, caseload, or organization.
                {role.sharedStudent
                  ? " Student, Family, and Educator previews share one fictional student:"
                  : " Everything shown is illustrative."}
              </p>
              {role.sharedStudent && (
                <div className="mt-3 rounded-xl border bg-card p-3">
                  <p className="font-semibold">{SHARED_DEMO_STUDENT.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {SHARED_DEMO_STUDENT.pronouns} · Grade {SHARED_DEMO_STUDENT.grade} · {SHARED_DEMO_STUDENT.school}
                  </p>
                  <blockquote className="mt-2 border-l-2 border-primary/40 pl-2 text-xs italic text-foreground/80">
                    "{SHARED_DEMO_STUDENT.quote}"
                  </blockquote>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* DASHBOARD MOCK */}
        <section className="mt-12">
          <SectionHeader index="01" title={role.dashboardTitle} kicker="At a glance" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {role.dashboardTiles.map((tile) => (
              <div key={tile.label} className="rounded-2xl border bg-card p-4 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {tile.label}
                </p>
                <p className="mt-2 font-display text-2xl leading-tight">{tile.value}</p>
                {tile.hint && (
                  <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* TOOL PREVIEWS — mirrors the signed-in dashboard */}
        <section className="mt-12">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold tracking-widest text-primary">02</span>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Dashboard preview
                </span>
                <h2 className="font-display text-lg sm:text-xl">
                  <LayoutDashboard className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden />
                  Every tool this role sees at sign-in
                </h2>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample data
            </span>
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
              />
            ))}
          </DemoToolPreviewGrid>
        </section>

        {/* VALUE STRIP */}
        <section className="mt-12 rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <SectionHeader index="03" title="What this role gets" kicker="Value" inline />
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {role.valueBullets.map((b) => (
              <li key={b} className="flex items-start gap-2 rounded-xl bg-background p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="italic">"{b}"</span>
              </li>
            ))}
          </ul>
        </section>

        {/* TOOLS · ACTIONS · OUTPUTS */}
        <section className="mt-12 grid gap-4 lg:grid-cols-3">
          <TripleCard icon={<Wrench className="h-4 w-4" />} title="Key tools" items={role.tools} index="04" />
          <TripleCard icon={<Target className="h-4 w-4" />} title="Actions this role can take" items={role.actions} index="05" />
          <TripleCard icon={<FileText className="h-4 w-4" />} title="Outputs they receive" items={role.outputs} index="06" />
        </section>


        {/* BOUNDARY (partner) */}
        {role.boundary && (
          <section className="mt-12 rounded-3xl border-2 border-amber-500/40 bg-amber-50 p-6 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
              <div>
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
          </section>
        )}

        {/* CTA */}
        <section className="mt-12 rounded-3xl border bg-gradient-hero p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">Ready to take the next step?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Join the waitlist, request a pilot, or keep exploring how each role fits together.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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
        </section>

        {/* CONTINUE THE TOUR */}
        {next && (
          <section className="mt-6 flex items-center justify-between rounded-2xl border bg-card p-4">
            <span className="text-sm text-muted-foreground">Continue the tour</span>
            <Button asChild variant="ghost" size="sm">
              <Link to={next.path}>
                Next: {next.label} preview <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </section>
        )}
      </div>
    </SiteShell>
  );
}

function SectionHeader({
  index,
  title,
  kicker,
  inline,
}: {
  index: string;
  title: string;
  kicker?: string;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "flex items-center gap-3" : "mb-4 flex items-baseline gap-3"}>
      <span className="font-mono text-xs font-semibold tracking-widest text-primary">
        {index}
      </span>
      <div className="h-px flex-1 bg-border" aria-hidden />
      <div className="flex items-baseline gap-2">
        {kicker && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {kicker}
          </span>
        )}
        <h2 className="font-display text-lg sm:text-xl">{title}</h2>
      </div>
    </div>
  );
}

function TripleCard({
  icon,
  title,
  items,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  index: string;
}) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <span className="font-mono text-[10px] font-semibold tracking-widest text-primary">
          {index}
        </span>
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
