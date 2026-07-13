import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Users,
  ClipboardList,
  FileText,
  TrendingUp,
  BookOpen,
  CalendarDays,
  LifeBuoy,
  Rocket,
  ArrowRight,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { toTitleCase } from "@/lib/title-case";
import { ToolPreviewSection, ToolPreviewGrid } from "../ToolPreviewCard";
import {
  SchoolAdminFeatureDrawer,
  type SchoolAdminFeatureState,
} from "@/components/dashboard/school-admin/SchoolAdminFeatureDrawer";
import {
  SCHOOL_ADMIN_FEATURE_DETAILS,
  type SchoolAdminFeatureId,
} from "@/lib/demo/school-admin/feature-details";

type Tile = {
  featureId: SchoolAdminFeatureId;
  icon: LucideIcon;
  title: string;
  status: string;
  tone: "default" | "success" | "warning" | "critical" | "muted";
  summary: string;
  bullets?: { label: string; value: string }[];
  cta: { label: string; to: string };
  defaultState?: SchoolAdminFeatureState;
};

const TILES: Tile[] = [
  {
    featureId: "school-overview",
    icon: Building2,
    title: "School Overview",
    status: "148 students",
    tone: "default",
    summary: "Planning status, students connected, reports completed, and next best step.",
    bullets: [
      { label: "Reports complete", value: "62%" },
      { label: "Active staff", value: "11" },
    ],
    cta: { label: "Open Overview", to: "/school/overview" },
  },
  {
    featureId: "team-access",
    icon: Users,
    title: "Team / Staff Access",
    status: "2 pending",
    tone: "warning",
    summary: "Roles, access levels, caseload assignments, and pending staff invites.",
    bullets: [
      { label: "Active", value: "11" },
      { label: "Unassigned caseload", value: "4" },
    ],
    cta: { label: "Manage Staff", to: "/school/team" },
  },
  {
    featureId: "planning-status",
    icon: ClipboardList,
    title: "Student Planning Status",
    status: "18 behind",
    tone: "warning",
    summary: "Where every student stands on planning — aggregated, no private docs surfaced.",
    bullets: [
      { label: "In planning", value: "148" },
      { label: "Ready for PPT", value: "27" },
    ],
    cta: { label: "Open Planning", to: "/school/planning-status" },
  },
  {
    featureId: "report-completion",
    icon: FileText,
    title: "Report Completion",
    status: "6 missing",
    tone: "warning",
    summary: "Completed, in-progress, and missing Pathway Reports with blockers and next steps.",
    bullets: [
      { label: "Complete", value: "92" },
      { label: "In progress", value: "50" },
    ],
    cta: { label: "Open Reports", to: "/school/reports" },
  },
  {
    featureId: "readiness-trends",
    icon: TrendingUp,
    title: "Readiness Trends",
    status: "This term",
    tone: "success",
    summary: "Aggregate movement across employment, education, independent living, self-advocacy.",
    bullets: [
      { label: "On track", value: "68%" },
      { label: "Needs support", value: "24%" },
    ],
    cta: { label: "Open Trends", to: "/school/readiness-trends" },
  },
  {
    featureId: "resource-usage",
    icon: BookOpen,
    title: "Resource Usage",
    status: "412 opens",
    tone: "muted",
    summary: "What families and staff actually open — with recommendations for gaps.",
    bullets: [
      { label: "Unique resources", value: "38" },
      { label: "Recommended unopened", value: "7" },
    ],
    cta: { label: "Open Usage", to: "/school/resource-usage" },
  },
  {
    featureId: "calendar",
    icon: CalendarDays,
    title: "Calendar",
    status: "6 this week",
    tone: "muted",
    summary: "School meetings, transition planning deadlines, and staff implementation dates.",
    bullets: [
      { label: "Next 30 days", value: "23" },
      { label: "Report deadlines", value: "4" },
    ],
    cta: { label: "Open Calendar", to: "/school/calendar" },
  },
  {
    featureId: "support-needs",
    icon: LifeBuoy,
    title: "Support Needs",
    status: "5 open",
    tone: "critical",
    summary: "Staffing, training, and implementation blockers with recommended next actions.",
    bullets: [
      { label: "Staffing", value: "2" },
      { label: "Training", value: "2" },
    ],
    cta: { label: "Open Support Needs", to: "/school/support-needs" },
  },
  {
    featureId: "implementation",
    icon: Rocket,
    title: "Implementation Progress",
    status: "6 of 9",
    tone: "default",
    summary: "Onboarding, staff activation, student connection progress, and the next milestone.",
    bullets: [
      { label: "Staff active", value: "11 of 13" },
      { label: "Students connected", value: "148 of 160" },
    ],
    cta: { label: "Open Implementation", to: "/school/implementation" },
  },
];

/**
 * School Admin at-a-glance grid. Every tile:
 *  - has a Preview button that opens the shared SchoolAdminFeatureDrawer
 *    (which owns loading / empty / error / permission / ready variants)
 *  - has a direct link into the full building-level workflow
 * All data is aggregate — never expose individual student records here.
 */
export function SchoolAdminOverviewGrid({ isSample = false }: { isSample?: boolean } = {}) {
  const [openFeature, setOpenFeature] = useState<SchoolAdminFeatureId | null>(null);
  const [state, setState] = useState<SchoolAdminFeatureState>("ready");

  const activeTile = TILES.find((t) => t.featureId === openFeature);

  return (
    <ToolPreviewSection
      eyebrow="Your School Workspace"
      title="School-Level Implementation, In One View"
      description="Preview any tool inline. Every card explains what it does, what feeds it, and the next step you can take today. Aggregate only — no private student records surfaced here."
    >
      <ToolPreviewGrid>
        {TILES.map((tile) => (
          <SchoolAdminTile
            key={tile.featureId}
            tile={tile}
            onPreview={() => {
              setState(tile.defaultState ?? "ready");
              setOpenFeature(tile.featureId);
            }}
          />
        ))}
      </ToolPreviewGrid>

      <SchoolAdminFeatureDrawer
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
            {(["ready", "loading", "empty", "error", "permission"] as SchoolAdminFeatureState[]).map(
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

function SchoolAdminTile({ tile, onPreview }: { tile: Tile; onPreview: () => void }) {
  const Icon = tile.icon;
  const detail = SCHOOL_ADMIN_FEATURE_DETAILS[tile.featureId];
  const toneClass = TONE[tile.tone];
  return (
    <div className="group relative flex h-full min-h-[17rem] flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span aria-hidden />
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ${toneClass}`}
        >
          {tile.status}
        </span>
      </div>
      <h3 className="mt-4 font-display text-lg font-medium tracking-tight">
        {toTitleCase(tile.title)}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tile.summary}</p>
      {tile.bullets && (
        <ul className="mt-4 space-y-1.5 text-sm">
          {tile.bullets.map((b) => (
            <li key={b.label} className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">{toTitleCase(b.label)}</span>
              <span className="font-medium text-foreground">{b.value}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Preview shows: {detail.rows.length} items · {detail.connectsTo.length} connected tools
      </p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
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

const TONE: Record<Tile["tone"], string> = {
  default: "bg-primary/10 text-primary ring-primary/20",
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  critical: "bg-destructive/10 text-destructive ring-destructive/20",
  muted: "bg-muted text-muted-foreground ring-border",
};
