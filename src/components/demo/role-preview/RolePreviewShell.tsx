import { DemoDashboardWidgets } from "@/components/demo/DemoDashboardWidgets";
import { useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Shield } from "lucide-react";
import type { DemoRolePreview } from "@/lib/demo/role-previews";
import { DEMO_ROLES, DEMO_ROLE_ORDER } from "@/lib/demo/role-previews";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/layout/PageSection";
import { RoleContextSelector } from "@/components/demo/RoleContextSelector";
import { toTitleCase } from "@/lib/title-case";
import { CommandMetricStrip, CommandZone } from "@/components/dashboard/CommandCenter";
import { NextActionCard } from "@/components/next-actions/NextActionCard";
import { DEMO_NEXT_ACTIONS } from "@/lib/next-actions/demo-fixtures";
import type { NextActionRole } from "@/lib/next-actions/types";
import type { DemoRoleId } from "@/lib/demo/role-previews";
import { useDemoStudent } from "@/lib/demo/use-demo-student";
import { WORKSPACE_STAGES, type StageId } from "@/lib/workspace/stages";

function asStageId(raw: string | undefined): StageId | undefined {
  return WORKSPACE_STAGES.find((s) => s.id === raw)?.id;
}
import { useDemoRoleView } from "@/lib/demo/use-demo-role-view";
import { resolveDemoRoleDestination, toHref } from "@/lib/demo/role-routing";
import {
  headlineForProfile,
  introForProfile,
  sharedStudentFromProfile,
  tilesForProfile,
} from "@/lib/demo/profile-shell";
import { useDemoSchool, useDemoDistrict, useDemoPartnerPlan } from "@/lib/demo/use-role-context";
import { schoolTilesFor, districtTilesFor, partnerTilesFor } from "@/lib/demo/role-contexts";

function demoRoleToNextActionRole(id: DemoRoleId): NextActionRole {
  switch (id) {
    case "school-admin":
      return "school_admin";
    case "district-admin":
      return "district_admin";
    default:
      return id as NextActionRole;
  }
}

/**
 * Sticky role selector — appears on every /demo/<role> page so a visitor
 * can hop between role previews without going back to the hub.
 *
 * Uses the centralized `resolveDemoRoleDestination` resolver so every
 * switch lands on the correct canonical dashboard (or, when currently
 * inside the Transition Workspace, preserves the stage for workspace
 * roles only). No stale "last workspace stage" is ever consulted here.
 */
export function RoleNavChips({ current }: { current: DemoRolePreview["id"] }) {
  const navigate = useNavigate();
  const { setRole } = useDemoRoleView();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const { profile } = useDemoStudent();

  const handleClick = (id: DemoRoleId) => (e: React.MouseEvent) => {
    e.preventDefault();
    setRole(id);
    const dest = resolveDemoRoleDestination({
      currentPath,
      targetRole: id,
      studentId: profile.id,
    });
    navigate({ to: dest.to, search: dest.search });
  };

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
          const dest = resolveDemoRoleDestination({
            currentPath,
            targetRole: id,
            studentId: profile.id,
          });
          return (
            <Link
              key={id}
              to={toHref(dest)}
              onClick={handleClick(id)}
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
        <div className="ml-auto">
          <RoleContextSelector role={current} compact />
        </div>
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
  student: {
    primary: "oklch(0.60 0.14 235)",
    primaryFg: "oklch(0.99 0.005 220)",
    accent: "oklch(0.90 0.06 230)",
  },
  family: {
    primary: "oklch(0.60 0.16 15)",
    primaryFg: "oklch(0.99 0.005 220)",
    accent: "oklch(0.92 0.05 20)",
  },
  educator: {
    primary: "oklch(0.55 0.13 160)",
    primaryFg: "oklch(0.99 0.005 220)",
    accent: "oklch(0.92 0.05 155)",
  },
  "school-admin": {
    primary: "oklch(0.55 0.16 290)",
    primaryFg: "oklch(0.99 0.005 220)",
    accent: "oklch(0.92 0.05 290)",
  },
  "district-admin": {
    primary: "oklch(0.48 0.16 265)",
    primaryFg: "oklch(0.99 0.005 220)",
    accent: "oklch(0.92 0.05 265)",
  },
  partner: {
    primary: "oklch(0.62 0.15 55)",
    primaryFg: "oklch(0.18 0.04 250)",
    accent: "oklch(0.92 0.06 55)",
  },
  owner: {
    primary: "oklch(0.42 0.05 250)",
    primaryFg: "oklch(0.99 0.005 220)",
    accent: "oklch(0.90 0.02 250)",
  },
};

export function RolePreviewShell({
  role,
  workspace,
  extras,
  afterWorkspace,
}: {
  role: DemoRolePreview;
  /** Approved role Workspace internals. This block may move, but its children are not redesigned here. */
  workspace?: React.ReactNode;
  /** Back-compat: older routes passed workspace content as extras. */
  extras?: React.ReactNode;
  /** Optional block rendered directly beneath the Workspace zone. */
  afterWorkspace?: React.ReactNode;
}) {
  const Icon = role.icon;
  const { setRole } = useDemoRoleView();
  useEffect(() => {
    setRole(role.id);
  }, [role.id, setRole]);
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

  const { profile } = useDemoStudent();
  const { school } = useDemoSchool();
  const { district } = useDemoDistrict();
  const { plan } = useDemoPartnerPlan();
  const sharedStudent = sharedStudentFromProfile(profile);
  const baseTiles = tilesForProfile(role, profile);
  const tiles =
    role.id === "school-admin"
      ? schoolTilesFor(school)
      : role.id === "district-admin"
        ? districtTilesFor(district)
        : role.id === "partner"
          ? partnerTilesFor(plan)
          : baseTiles;
  const headline =
    role.id === "school-admin"
      ? `See What ${school.displayName} Would See.`
      : role.id === "district-admin"
        ? `See What ${district.displayName} Would See.`
        : role.id === "partner"
          ? `See The Partner Dashboard — ${plan.label}.`
          : headlineForProfile(role, profile);
  const intro =
    role.id === "school-admin"
      ? `${school.tagline}. ${school.activityHeadline}. Switch schools from the header to compare a comprehensive high school with a specialized program.`
      : role.id === "district-admin"
        ? `${district.tagline}. ${district.activityHeadline}. Switch districts from the header to compare a large regional network with a smaller local district.`
        : role.id === "partner"
          ? `${plan.tagline}. Toggle Free and Premium from the header to see how listing capabilities change. Premium never expands access to protected student data.`
          : introForProfile(role, profile);

  return (
    <SiteShell>
      <div className={"planning-dashboard"} data-role-accent={role.id} style={accentStyle}>
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
                <h1 className="mt-1 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                  {toTitleCase(headline)}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {intro}
                </p>
              </div>

              {role.sharedStudent && (
                <aside className="border-l border-border/70 pl-4 text-sm">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Selected demo student
                  </div>
                  <p className="mt-2 font-display text-base">{sharedStudent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sharedStudent.pronouns} · Grade {sharedStudent.grade}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{sharedStudent.school}</p>
                  <blockquote className="mt-3 border-l-2 border-primary pl-2.5 text-xs italic text-foreground/80">
                    &ldquo;{sharedStudent.quote}&rdquo;
                  </blockquote>
                </aside>
              )}
            </div>
          </header>
        </PageSection>

        {/* Summary Zone */}
        <PageSection spacing="tight">
          <CommandMetricStrip
            items={tiles.map((tile) => ({
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
          <PageSection spacing="none">
            <section
              aria-label="Workspace"
              className="border-y border-primary/25 bg-primary/[0.035] pt-0 pb-5 sm:pb-6"
            >
              <div data-preserve-workspace-internals>{workspaceContent}</div>
            </section>
          </PageSection>
        ) : null}

        <PageSection spacing="tight">
          <DemoDashboardWidgets role={role.id} />
        </PageSection>
      </div>
    </SiteShell>
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
          <li
            key={i}
            className="flex items-start gap-1.5 text-[12.5px] leading-snug text-foreground/85"
          >
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
  const stage = workspaceMatch ? asStageId(workspaceMatch[1]) : undefined;
  if (stage) {
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
