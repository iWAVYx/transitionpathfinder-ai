import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  School,
  BarChart3,
  TrendingUp,
  Rocket,
  FileText,
  AlertTriangle,
  ArrowRight,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { toTitleCase } from "@/lib/title-case";
import { Pill } from "@/components/ui/pill";
import { ToolPreviewSection, ToolPreviewGrid } from "../ToolPreviewCard";
import {
  DistrictAdminFeatureDrawer,
  type DistrictAdminFeatureState,
} from "@/components/dashboard/district-admin/DistrictAdminFeatureDrawer";
import {
  DISTRICT_ADMIN_FEATURE_DETAILS,
  type DistrictAdminFeatureId,
} from "@/lib/demo/district-admin/feature-details";

type Tile = {
  featureId: DistrictAdminFeatureId;
  icon: LucideIcon;
  title: string;
  status: string;
  tone: "default" | "success" | "warning" | "critical" | "muted";
  summary: string;
  bullets?: { label: string; value: string }[];
  cta: { label: string; to: string };
  defaultState?: DistrictAdminFeatureState;
};

const TILES: Tile[] = [
  {
    featureId: "district-overview",
    icon: Building2,
    title: "District Overview",
    status: "12 schools",
    tone: "default",
    summary: "Students, schools, and reports across the district. Aggregate only.",
    bullets: [
      { label: "Students", value: "1,842" },
      { label: "Reports complete", value: "58%" },
    ],
    cta: { label: "Open District Overview", to: "/district/overview" },
  },
  {
    featureId: "connected-schools",
    icon: School,
    title: "Connected Schools",
    status: "2 pending",
    tone: "warning",
    summary: "Every school onboarded, their admin, and their activation status.",
    bullets: [
      { label: "Onboarded", value: "12" },
      { label: "Needs admin", value: "1" },
    ],
    cta: { label: "Open Schools", to: "/district/schools" },
  },
  {
    featureId: "school-progress",
    icon: BarChart3,
    title: "School-by-School Progress",
    status: "3 behind",
    tone: "warning",
    summary: "Planning status, report completion, and support-needs — by school.",
    bullets: [
      { label: "On pace", value: "8" },
      { label: "Critical", value: "1" },
    ],
    cta: { label: "Compare Schools", to: "/district/progress" },
  },
  {
    featureId: "readiness-trend",
    icon: TrendingUp,
    title: "Readiness Trend",
    status: "This term",
    tone: "success",
    summary: "District-wide movement across the four readiness domains.",
    bullets: [
      { label: "On track", value: "64%" },
      { label: "Needs support", value: "27%" },
    ],
    cta: { label: "Open Readiness Trend", to: "/district/readiness-trends" },
  },
  {
    featureId: "implementation",
    icon: Rocket,
    title: "Implementation Progress",
    status: "3 onboarding",
    tone: "warning",
    summary: "Where each school is in the rollout — onboarding, active, mature.",
    bullets: [
      { label: "Mature", value: "5" },
      { label: "Active", value: "6" },
    ],
    cta: { label: "Open Implementation", to: "/district/implementation" },
  },
  {
    featureId: "district-reports",
    icon: FileText,
    title: "District Reports",
    status: "View",
    tone: "muted",
    summary: "Aggregate Pathway Report generation and outcomes.",
    bullets: [
      { label: "Complete", value: "1,070" },
      { label: "Missing", value: "160" },
    ],
    cta: { label: "Open Reports", to: "/district/reports" },
  },
  {
    featureId: "service-gaps",
    icon: AlertTriangle,
    title: "Service Gaps",
    status: "3 critical",
    tone: "critical",
    summary: "Programs, providers, or supports missing where students need them.",
    bullets: [
      { label: "Open gaps", value: "9" },
      { label: "Programs needed", value: "5" },
    ],
    cta: { label: "Open Service Gaps", to: "/district/service-gaps" },
  },
];

/**
 * District Admin at-a-glance grid. Every tile:
 *  - has a Preview button that opens the shared DistrictAdminFeatureDrawer
 *    (which owns loading / empty / error / permission / ready variants)
 *  - has a direct link into the full district-level workflow
 * All data is aggregate — never expose individual student records here.
 */
export function DistrictAdminOverviewGrid({ isSample = false }: { isSample?: boolean } = {}) {
  const [openFeature, setOpenFeature] = useState<DistrictAdminFeatureId | null>(null);
  const [state, setState] = useState<DistrictAdminFeatureState>("ready");

  const activeTile = TILES.find((t) => t.featureId === openFeature);

  return (
    <ToolPreviewSection
      eyebrow="Your District Workspace"
      title="District Readiness And Adoption"
      description="Roll-ups across every connected school — implementation progress, readiness trends, and service gaps that need attention. Aggregate only — no private student records surfaced here."
    >
      <ToolPreviewGrid>
        {TILES.map((tile) => (
          <DistrictAdminTile
            key={tile.featureId}
            tile={tile}
            onPreview={() => {
              setState(tile.defaultState ?? "ready");
              setOpenFeature(tile.featureId);
            }}
          />
        ))}
      </ToolPreviewGrid>

      <DistrictAdminFeatureDrawer
        featureId={openFeature}
        icon={activeTile?.icon}
        isSample={isSample}
        state={state}
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

      {openFeature && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center sm:justify-end sm:pr-6">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border bg-background/95 p-1 text-[11px] shadow-lift backdrop-blur">
            {(["ready", "loading", "empty", "error", "permission"] as DistrictAdminFeatureState[]).map(
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

function DistrictAdminTile({ tile, onPreview }: { tile: Tile; onPreview: () => void }) {
  const Icon = tile.icon;
  const detail = DISTRICT_ADMIN_FEATURE_DETAILS[tile.featureId];
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
        <Link
          to={tile.cta.to as string}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {toTitleCase(tile.cta.label)}
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );
}

