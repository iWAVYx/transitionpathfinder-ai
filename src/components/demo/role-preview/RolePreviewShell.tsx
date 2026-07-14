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
import { toTitleCase } from "@/lib/title-case";
import {
  CommandMetricStrip,
  CommandRows,
  CommandZone,
  type CommandRow,
} from "@/components/dashboard/CommandCenter";


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
  workspace,
  extras,
}: {
  role: DemoRolePreview;
  /** Approved role Workspace internals. This block may move, but its children are not redesigned here. */
  workspace?: React.ReactNode;
  /** Back-compat: older routes passed workspace content as extras. */
  extras?: React.ReactNode;
}) {
  const Icon = role.icon;
  const next = role.next ? DEMO_ROLES[role.next] : null;
  const workspaceContent = workspace ?? extras;
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

      {/* Header Zone */}
      <PageSection spacing="tight">
        <header className="border-b border-border/70 pb-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
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
            </div>

            {role.sharedStudent && (
              <aside className="border-l border-border/70 pl-4 text-sm">
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
        </header>
      </PageSection>

      {/* Summary Zone */}
      <PageSection spacing="tight">
        <CommandMetricStrip
          items={role.dashboardTiles.map((tile) => ({
            label: tile.label,
            value: tile.value,
            hint: tile.hint,
            tone: tile.value.match(/needed|due|pending|flagged|gap/i) ? "warn" : "neutral",
          }))}
        />
      </PageSection>

      {/* WORKSPACE ZONE — anchored, tinted band that groups the approved
          workspace dashboard directly beneath the hero. Visually claimed
          as the primary work area so subsequent zones read as secondary. */}
      {workspaceContent ? (
        <PageSection spacing="tight">
          <section aria-label="Workspace" className="border-y border-primary/25 bg-primary/[0.035] py-5 sm:py-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b border-primary/15 pb-3">
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
            <div data-preserve-workspace-internals>{workspaceContent}</div>
          </section>
        </PageSection>
      ) : null}

      {/* Operations Zone */}
      <PageSection spacing="tight">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <CommandZone eyebrow="Operations" title="What Needs Attention">
            <CommandRows rows={toolRowsFor(role)} />
          </CommandZone>

          <CommandZone eyebrow="Activity / Next Steps" title="Actions And Outputs">
            <div className="space-y-5">
              <MiniList icon={<Target className="h-3.5 w-3.5" />} title="Actions" items={role.actions} />
              <MiniList icon={<FileText className="h-3.5 w-3.5" />} title="Outputs" items={role.outputs} />
              <ul className="space-y-2 border-t border-border/60 pt-3">
                {role.valueBullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[13px] leading-snug">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-foreground/85">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CommandZone>
        </div>
      </PageSection>

      {/* BOUNDARY (partner) */}
      {role.boundary && (
        <PageSection spacing="tight">
          <div className="border-y border-amber-500/40 bg-amber-50/70 py-5 dark:bg-amber-950/20 sm:py-6">
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
        <div className="border-t border-border/70 pt-5 sm:pt-6">
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
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

function toolRowsFor(role: DemoRolePreview): CommandRow[] {
  return role.toolPreviews.slice(0, 8).map((tool) => ({
    icon: tool.icon,
    label: tool.title,
    detail: tool.summary,
    status: tool.status,
    to: tool.cta?.to,
    tone:
      tool.tone === "success"
        ? "success"
        : tool.tone === "warning"
          ? "warn"
          : tool.tone === "critical"
            ? "risk"
            : "neutral",
  }));
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
 * MiniList — flat, card-less column for the Under-the-Hood zone. Replaces
 * TripleCard's card wrapper with a compact icon + title + bullet list so
 * three columns sit visually quieter beneath the Workspace zone.
 */
function MiniList({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/15">
          {icon}
        </span>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
          {title}
        </h3>
      </div>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-foreground/85">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
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
