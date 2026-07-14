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

  return (
    <SiteShell>
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

      {/* HERO */}
      <PageSection spacing="tight">
        <div className="rounded-3xl border-2 border-dashed border-primary/30 bg-gradient-hero p-4 shadow-soft sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <Badge variant="outline" className="border-primary text-primary">
                  {toTitleCase(role.label)} · Demo
                </Badge>
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                {toTitleCase(role.tagline)}
              </p>
              <h1 className="mt-1.5 font-display text-2xl tracking-tight sm:text-3xl">
                {toTitleCase(role.headline)}
              </h1>
              <p className="mt-2.5 max-w-2xl text-sm leading-snug text-muted-foreground">
                {role.intro}
              </p>
            </div>


            <aside className="rounded-2xl border bg-background/80 p-4 text-sm shadow-soft">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Sample data only
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Nothing here is a real student, caseload, or organization.
                {role.sharedStudent
                  ? " Student, Family, and Educator previews share one fictional student:"
                  : " Everything shown is illustrative."}
              </p>
              {role.sharedStudent && (
                <div className="mt-2.5 rounded-xl border bg-card p-2.5">
                  <p className="font-semibold text-sm">{SHARED_DEMO_STUDENT.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {SHARED_DEMO_STUDENT.pronouns} · Grade {SHARED_DEMO_STUDENT.grade} ·{" "}
                    {SHARED_DEMO_STUDENT.school}
                  </p>
                  <blockquote className="mt-1.5 border-l-2 border-primary/40 pl-2 text-xs italic text-foreground/80">
                    &ldquo;{SHARED_DEMO_STUDENT.quote}&rdquo;
                  </blockquote>
                </div>
              )}
            </aside>
          </div>
        </div>
      </PageSection>

      {/* WORKSPACE DASHBOARD — same structure as the signed-in role dashboard. */}
      {extras ? <PageSection spacing="tight">{extras}</PageSection> : null}



      {/* VALUE STRIP */}
      <PageSection spacing="tight">
        <div className="rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
          <SectionHeading
            index="02"
            eyebrow="Value"
            title="What This Role Gets"
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
          title="Tools, Actions, Outputs"
          size="sm"
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <TripleCard
            icon={<Wrench className="h-4 w-4" />}
            title="Key Tools"
            items={role.tools}
          />
          <TripleCard
            icon={<Target className="h-4 w-4" />}
            title="Actions This Role Can Take"
            items={role.actions}
          />
          <TripleCard
            icon={<FileText className="h-4 w-4" />}
            title="Outputs They Receive"
            items={role.outputs}
          />
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
    <div className="flex h-full flex-col rounded-3xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <span className="text-primary">{icon}</span>
        <h3 className="font-display text-base">{title}</h3>
      </div>
      <ul className="mt-2.5 space-y-1.5">
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
