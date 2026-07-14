import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Shield,
  CheckCircle2,
  Wrench,
  Target,
  FileText,
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
import { toTitleCase } from "@/lib/title-case";


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

/**
 * Per-role accent palette — mirrors the signed-in HubShell accents so a
 * visitor previewing /demo/family sees the same rose accent that the
 * signed-in Family hub uses, /demo/educator the same emerald, and so on.
 */
const DEMO_ROLE_ACCENTS: Record<string, { primary: string; primaryFg: string; accent: string }> = {
  student:        { primary: "oklch(0.60 0.14 235)", primaryFg: "oklch(0.99 0.005 220)", accent: "oklch(0.90 0.06 230)" },
  family:         { primary: "oklch(0.60 0.16 15)",  primaryFg: "oklch(0.99 0.005 220)", accent: "oklch(0.92 0.05 20)" },
  educator:       { primary: "oklch(0.55 0.13 160)", primaryFg: "oklch(0.99 0.005 220)", accent: "oklch(0.92 0.05 155)" },
  "school-admin": { primary: "oklch(0.55 0.16 290)", primaryFg: "oklch(0.99 0.005 220)", accent: "oklch(0.92 0.05 290)" },
  "district-admin": { primary: "oklch(0.48 0.16 265)", primaryFg: "oklch(0.99 0.005 220)", accent: "oklch(0.92 0.05 265)" },
  partner:        { primary: "oklch(0.62 0.15 55)",  primaryFg: "oklch(0.18 0.04 250)",  accent: "oklch(0.92 0.06 55)" },
  owner:          { primary: "oklch(0.42 0.05 250)", primaryFg: "oklch(0.99 0.005 220)", accent: "oklch(0.90 0.02 250)" },
};

export function RolePreviewShell({
  role,
  extras,
}: {
  role: DemoRolePreview;
  /** Role-specific workspace dashboard matching the signed-in role experience. */
  extras?: React.ReactNode;
}) {
  const Icon = role.icon;
  const next = role.next ? DEMO_ROLES[role.next] : null;
  const accent = DEMO_ROLE_ACCENTS[role.id];
  const accentStyle = accent
    ? ({
        ["--primary" as string]: accent.primary,
        ["--primary-foreground" as string]: accent.primaryFg,
        ["--accent" as string]: accent.accent,
      } as React.CSSProperties)
    : undefined;

  return (
    <SiteShell>
      <div data-role-accent={role.id} style={accentStyle}>

      <PageSection spacing="tight">
        <Breadcrumbs
          trail={[
            { label: "Demo", to: "/demo" },
            { label: `${toTitleCase(role.label)} Preview` },
          ]}
        />
      </PageSection>

      <PageSection spacing="none">
        <RoleNavChips current={role.id} />
      </PageSection>

      {/* HERO — color-blocked command header */}
      <PageSection spacing="tight">
        <div className="relative overflow-hidden rounded-2xl border bg-card shadow-soft">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/60 to-transparent" aria-hidden />
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
                  {toTitleCase(role.label)} · Demo
                </Badge>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-border">
                  <Sparkles className="h-2.5 w-2.5" /> Sample
                </span>
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                {toTitleCase(role.tagline)}
              </p>
              <h1 className="mt-1 font-display text-2xl leading-tight tracking-tight sm:text-3xl">
                {toTitleCase(role.headline)}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {role.intro}
              </p>

              <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-border/60 pt-4 sm:max-w-md">
                <div>
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tools</dt>
                  <dd className="mt-0.5 font-display text-lg text-foreground">{role.tools.length}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Actions</dt>
                  <dd className="mt-0.5 font-display text-lg text-foreground">{role.actions.length}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Outputs</dt>
                  <dd className="mt-0.5 font-display text-lg text-foreground">{role.outputs.length}</dd>
                </div>
              </dl>
            </div>

            {role.sharedStudent && (
              <aside className="rounded-xl border bg-muted/30 p-4 text-sm">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Shared demo student
                </div>
                <p className="mt-2 font-display text-base">{SHARED_DEMO_STUDENT.name}</p>
                <p className="text-xs text-muted-foreground">
                  {SHARED_DEMO_STUDENT.pronouns} · Grade {SHARED_DEMO_STUDENT.grade}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{SHARED_DEMO_STUDENT.school}</p>
                <blockquote className="mt-3 border-l-2 border-primary pl-2.5 text-xs italic text-foreground/80">
                  &ldquo;{SHARED_DEMO_STUDENT.quote}&rdquo;
                </blockquote>
              </aside>
            )}
          </div>
        </div>
      </PageSection>

      {/* WORKSPACE ZONE — anchored, tinted band that groups the approved
          workspace dashboard directly beneath the hero. Visually claimed
          as the primary work area so subsequent zones read as secondary. */}
      {extras ? (
        <PageSection spacing="tight">
          <div className="relative rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.05] p-4 shadow-sm sm:p-6">
            <span className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-primary via-primary/60 to-accent/60" aria-hidden />
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-primary/15 pb-3">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary">
                  Workspace
                </p>
                <h2 className="font-display text-lg tracking-tight">Your Role Dashboard</h2>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Primary work area
              </span>
            </div>
            <div className="space-y-8">{extras}</div>
          </div>
        </PageSection>
      ) : null}

      {/* SECONDARY ZONE — value + under-the-hood combined into one quieter,
          scannable panel instead of two stacked cards. */}
      <PageSection spacing="tight">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* Under the hood — compact 3-column list */}
          <section>
            <header className="mb-3 flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Under The Hood
                </p>
                <h2 className="font-display text-base tracking-tight">Tools · Actions · Outputs</h2>
              </div>
            </header>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
              <MiniList icon={<Wrench className="h-3.5 w-3.5" />} title="Tools" items={role.tools} />
              <MiniList icon={<Target className="h-3.5 w-3.5" />} title="Actions" items={role.actions} />
              <MiniList icon={<FileText className="h-3.5 w-3.5" />} title="Outputs" items={role.outputs} />
            </div>
          </section>

          {/* Value bullets — quiet quoted list, no card wrapper */}
          <section>
            <header className="mb-3 flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Value
                </p>
                <h2 className="font-display text-base tracking-tight">What This Role Gets</h2>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {role.valueBullets.length}
              </span>
            </header>
            <ul className="space-y-2">
              {role.valueBullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[13px] leading-snug">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="italic text-foreground/85">&ldquo;{b}&rdquo;</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </PageSection>

      {/* BOUNDARY (partner) */}
      {role.boundary && (
        <PageSection spacing="tight">
          <div className="rounded-3xl border-2 border-amber-500/40 bg-amber-50 p-5 dark:bg-amber-950/20 sm:p-6">
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
        <div className="rounded-3xl border bg-gradient-hero p-5 shadow-soft sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <h2 className="font-display text-xl sm:text-2xl">Ready To Take The Next Step?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Join the waitlist, request a pilot, or keep exploring how each role fits together.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button asChild size="lg">
                <RoleAwareCtaLink to={role.ctaPrimary.to} roleId={role.id}>
                  {role.ctaPrimary.label}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </RoleAwareCtaLink>
              </Button>
              {role.ctaSecondary && (
                <Button asChild size="lg" variant="outline">
                  <RoleAwareCtaLink to={role.ctaSecondary.to} roleId={role.id}>
                    {role.ctaSecondary.label}
                  </RoleAwareCtaLink>
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
                Next: {toTitleCase(next.label)} preview <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>

          </div>
        </PageSection>
      )}
      </div>
    </SiteShell>
  );
}

function TripleCard({
  icon,
  title,
  items,
  step,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  step?: string;
}) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <span className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary/30 to-transparent" aria-hidden />
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            {icon}
          </span>
          <h3 className="font-display text-[15px] tracking-tight">{title}</h3>
        </div>
        {step && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-border">
            {step}
          </span>
        )}
      </div>
      <ul className="mt-2 space-y-1.5 px-4 pb-4">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * RoleAwareCtaLink — renders a `<Link>` that, when the target points at
 * the demo Workspace Tour, preserves the current role via `?role=` so
 * "Back" from the tour returns to this role preview.
 */
function RoleAwareCtaLink({
  to,
  roleId,
  children,
  ...rest
}: {
  to: string;
  roleId: import("@/lib/demo/role-previews").DemoRoleId;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"a">, "href">) {
  const workspaceMatch = to.match(/^\/demo\/workspace\/([^/?#]+)/);
  if (workspaceMatch) {
    const stage = workspaceMatch[1];
    const isReport = stage === "roadmap";
    return (
      <Link
        {...(rest as Record<string, unknown>)}
        to="/demo/workspace/$stage"
        params={{ stage }}
        search={isReport ? { role: roleId, expand: true } : { role: roleId }}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link {...(rest as Record<string, unknown>)} to={to}>
      {children}
    </Link>
  );
}
