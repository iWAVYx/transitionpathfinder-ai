import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  UserCog,
  Sparkles,
  ClipboardList,
  CalendarClock,
  Settings2,
  Award,
  BookOpen,
  ShieldAlert,
  ArrowRight,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { toTitleCase } from "@/lib/title-case";
import { Pill } from "@/components/ui/pill";
import { ToolPreviewSection, ToolPreviewGrid } from "../ToolPreviewCard";
import { PartnerNetworkTile } from "@/components/partner-network/PartnerNetworkTile";
import {
  PartnerFeatureDrawer,
  type PartnerFeatureState,
} from "@/components/dashboard/partner/PartnerFeatureDrawer";
import {
  getPartnerFeatureDetails,
  PARTNER_TILE_META_BY_PLAN,
  type PartnerFeatureId,
} from "@/lib/demo/partner/feature-details";
import { resolveDemoFeatureRoute } from "@/lib/demo/feature-routes";
import { useDemoPartnerPlan } from "@/lib/demo/use-role-context";

type Tile = {
  featureId: PartnerFeatureId;
  icon: LucideIcon;
  title: string;
  status: string;
  tone: "default" | "success" | "warning" | "critical" | "muted";
  summary: string;
  bullets?: { label: string; value: string }[];
  cta: { label: string; to: string; search?: Record<string, string> };
  defaultState?: PartnerFeatureState;
};

const TILES: Tile[] = [
  {
    featureId: "partner-profile",
    icon: UserCog,
    title: "Partner Profile",
    status: "60% complete",
    tone: "warning",
    summary: "Organization details, mission, service areas, and contact.",
    bullets: [
      { label: "Verified", value: "Pending" },
      { label: "Service areas", value: "3" },
    ],
    cta: { label: "Edit Profile", to: "/partners-manage/profile" },
  },
  {
    featureId: "active-opportunities",
    icon: Sparkles,
    title: "Active Opportunities",
    status: "8 live",
    tone: "success",
    summary: "Programs, jobs, and services currently visible to families.",
    bullets: [
      { label: "Expiring soon", value: "2" },
      { label: "New this month", value: "1" },
    ],
    cta: {
      label: "See Active Opportunities",
      to: "/partners-manage/opportunities",
      search: { status: "approved" },
    },
  },
  {
    featureId: "submitted-programs",
    icon: ClipboardList,
    title: "Submitted Programs",
    status: "3 pending",
    tone: "warning",
    summary: "Program submissions awaiting admin approval.",
    bullets: [
      { label: "Changes requested", value: "1" },
      { label: "Avg review", value: "3 days" },
    ],
    cta: {
      label: "See Submissions",
      to: "/partners-manage/opportunities",
      search: { status: "pending_review" },
    },
  },
  {
    featureId: "application-windows",
    icon: CalendarClock,
    title: "Application Windows",
    status: "5 open",
    tone: "default",
    summary: "Application links and contact info for every published opportunity.",
    bullets: [
      { label: "Closing this month", value: "2" },
      { label: "Opening soon", value: "1" },
    ],
    cta: { label: "Open Windows", to: "/partners-manage/deadlines" },
  },
  {
    featureId: "opportunity-management",
    icon: Settings2,
    title: "Opportunity Management",
    status: "14 total",
    tone: "muted",
    summary: "Publish, unpublish, and update opportunities and program details.",
    bullets: [
      { label: "Published", value: "8" },
      { label: "Draft / archived", value: "6" },
    ],
    cta: {
      label: "Open Management",
      to: "/partners-manage/opportunities",
      search: { status: "all" },
    },
  },
  {
    featureId: "incentives",
    icon: Award,
    title: "PartnerForward Incentives",
    status: "18 listed",
    tone: "success",
    summary: "Grants, subsidies, and coaching that reward partners supporting transition-age youth.",
    bullets: [
      { label: "Federal", value: "6" },
      { label: "State & local", value: "9" },
    ],
    cta: { label: "Open Incentives", to: "/partnerforward/incentives" },
  },
  {
    featureId: "partner-resources",
    icon: BookOpen,
    title: "Partner Resources",
    status: "24 guides",
    tone: "muted",
    summary: "Playbooks, templates, and best-practice guides for partners.",
    bullets: [
      { label: "Templates", value: "12" },
      { label: "New this month", value: "3" },
    ],
    cta: { label: "Open Resources", to: "/partners-manage/resources" },
  },
];

/**
 * Partner dashboard tiles. CRITICAL: partners MUST NOT see any student
 * PII, documents, voice, goals, meetings, or pathway reports. Every CTA
 * here points to partner-scoped surfaces only. The drawer header also
 * carries a persistent "No student data" reminder.
 */
export function PartnerOverviewGrid({ isSample = false }: { isSample?: boolean } = {}) {
  const [openFeature, setOpenFeature] = useState<PartnerFeatureId | null>(null);
  const [state, setState] = useState<PartnerFeatureState>("ready");
  const { plan, planId } = useDemoPartnerPlan();

  const tileMeta = PARTNER_TILE_META_BY_PLAN[planId];
  const tiles = TILES.map((t) => {
    const m = tileMeta[t.featureId];
    return m ? { ...t, status: m.status, tone: m.tone, bullets: m.bullets } : t;
  });

  const activeTile = tiles.find((t) => t.featureId === openFeature);

  return (
    <ToolPreviewSection
      eyebrow={`${plan.label} · Partner Workspace`}
      title="Publish Opportunities. Reach The Right Families."
      description="Manage your organization profile, keep opportunities current, and access PartnerForward supports. This workspace is fully partner-scoped — no student data appears here."
    >
      <ToolPreviewGrid>
        {tiles.map((tile) => (
          <PartnerTile
            key={tile.featureId}
            tile={tile}
            isSample={isSample}
            planId={planId}
            onPreview={() => {
              setState(tile.defaultState ?? "ready");
              setOpenFeature(tile.featureId);
            }}
          />
        ))}
        <PartnerNetworkTile role="partner" />
      </ToolPreviewGrid>

      <PartnerFeatureDrawer
        featureId={openFeature}
        icon={activeTile?.icon}
        isSample={isSample}
        state={state}
        planId={planId}
        onRetry={() => {
          setState("loading");
          window.setTimeout(() => setState("ready"), 900);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setOpenFeature(null);
            setState("ready");
          }
        }}
      />

      <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>Partners never see student data.</strong> No IEPs, no documents,
            no student voice, no goals, no meetings, no pathway reports. Everything on
            this dashboard is partner-scoped.
          </span>
        </p>
      </div>

      {openFeature && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center sm:justify-end sm:pr-6">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border bg-background/95 p-1 text-[11px] shadow-lift backdrop-blur">
            {(["ready", "loading", "empty", "error", "permission"] as PartnerFeatureState[]).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setState(s)}
                  className={
                    state === s
                      ? "rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground"
                      : "rounded-full px-2.5 py-1 text-muted-foreground hover:text-foreground"
                  }
                >
                  {toTitleCase(s)}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </ToolPreviewSection>
  );
}

function PartnerTile({
  tile,
  onPreview,
  isSample = false,
  planId,
}: {
  tile: Tile;
  onPreview: () => void;
  isSample?: boolean;
  planId: "free" | "premium";
}) {
  const Icon = tile.icon;
  const detail = getPartnerFeatureDetails(planId)[tile.featureId];
  const ctaTo = isSample ? resolveDemoFeatureRoute("partner", tile.featureId) : (tile.cta.to as string);
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <span className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary/30 to-transparent" aria-hidden />
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <h3 className="min-w-0 truncate font-display text-[15px] font-semibold tracking-tight">
            {toTitleCase(tile.title)}
          </h3>
        </div>
        <Pill tone={tile.tone}>{tile.status}</Pill>
      </div>
      <p className="mt-1.5 line-clamp-2 px-3.5 text-[13px] leading-snug text-muted-foreground">{tile.summary}</p>
      {tile.bullets && tile.bullets.length > 0 && (
        <dl className="mx-3.5 mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-2">
          {tile.bullets.slice(0, 4).map((b) => (
            <div key={b.label} className="flex min-w-0 flex-col">
              <dt className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{toTitleCase(b.label)}</dt>
              <dd className="truncate text-[13px] font-semibold text-foreground">{b.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-2 px-3.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground/80">
        {detail.rows.length} items · {detail.connectsTo.length} connected
      </p>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3.5 py-2">
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:text-primary"
          aria-label={`Preview ${tile.title}`}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden /> Preview
        </button>
        {tile.cta.search && !isSample ? (
          <Link
            to={ctaTo}
            search={tile.cta.search}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {toTitleCase(tile.cta.label)}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        ) : (
          <Link
            to={ctaTo}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {toTitleCase(tile.cta.label)}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        )}
      </div>
    </div>
  );
}

