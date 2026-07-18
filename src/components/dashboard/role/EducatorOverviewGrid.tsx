import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  Gauge,
  ClipboardEdit,
  FileText,
  MessageCircleQuestion,
  NotebookPen,
  CheckSquare,
  CalendarDays,
  FolderOpen,
  ArrowRight,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { toTitleCase } from "@/lib/title-case";
import { Pill } from "@/components/ui/pill";
import { ToolPreviewSection, ToolPreviewGrid } from "../ToolPreviewCard";
import { PartnerNetworkTile } from "@/components/partner-network/PartnerNetworkTile";
import {
  EducatorFeatureDrawer,
  type EducatorFeatureState,
} from "@/components/dashboard/educator/EducatorFeatureDrawer";
import {
  EDUCATOR_FEATURE_DETAILS,
  type EducatorFeatureId,
} from "@/lib/demo/educator/feature-details";
import { resolveDemoFeatureRoute } from "@/lib/demo/feature-routes";

type Tile = {
  featureId: EducatorFeatureId;
  icon: LucideIcon;
  title: string;
  status: string;
  tone: "default" | "success" | "warning" | "critical" | "muted";
  summary: string;
  bullets?: { label: string; value: string }[];
  cta: { label: string; to: string };
  defaultState?: EducatorFeatureState;
};

const TILES: Tile[] = [
  {
    featureId: "caseload",
    icon: Users,
    title: "Caseload Snapshot",
    status: "8 students",
    tone: "default",
    summary: "Every student you support — grade, readiness, and next action.",
    bullets: [
      { label: "Next PPT ≤14d", value: "3" },
      { label: "Flagged", value: "2" },
    ],
    cta: { label: "Open Caseload", to: "/caseload" },
  },
  {
    featureId: "readiness",
    icon: Gauge,
    title: "Student Readiness",
    status: "1 critical",
    tone: "warning",
    summary: "Employment, education, independent living, and self-advocacy across your caseload.",
    bullets: [
      { label: "On track", value: "5" },
      { label: "Needs support", value: "2" },
    ],
    cta: { label: "See Readiness Gaps", to: "/educator/readiness-gaps" },
  },
  {
    featureId: "pending-input",
    icon: ClipboardEdit,
    title: "Pending Educator Input",
    status: "4 open",
    tone: "warning",
    summary: "Sections of Pathway Reports waiting on your input before they can move to draft.",
    bullets: [
      { label: "Due this week", value: "2" },
      { label: "Overdue", value: "1" },
    ],
    cta: { label: "Add Input", to: "/educator/pending-input" },
  },
  {
    featureId: "pathway-reports",
    icon: FileText,
    title: "Pathway Reports",
    status: "5 drafts",
    tone: "success",
    summary: "Latest reports for your caseload — snapshot, pathways, and questions for the team.",
    bullets: [
      { label: "Published", value: "2" },
      { label: "Needs input", value: "1" },
    ],
    cta: { label: "Open Reports", to: "/reports" },
  },
  {
    featureId: "meeting-prep",
    icon: MessageCircleQuestion,
    title: "Meeting Prep",
    status: "3 packs",
    tone: "default",
    summary: "PPT prep templates and question sets tailored to each student.",
    bullets: [
      { label: "Next meeting", value: "Sep 15" },
      { label: "Shared with family", value: "1" },
    ],
    cta: { label: "Prep For Meetings", to: "/ppt-prep" },
  },
  {
    featureId: "case-notes",
    icon: NotebookPen,
    title: "Case Notes",
    status: "12 this week",
    tone: "muted",
    summary: "Quick notes tied to each student, timestamped and searchable.",
    bullets: [
      { label: "Private", value: "5" },
      { label: "Shared", value: "7" },
    ],
    cta: { label: "Open Notes", to: "/educator/notes" },
  },
  {
    featureId: "action-items",
    icon: CheckSquare,
    title: "Action Items",
    status: "9 open",
    tone: "warning",
    summary: "Assign next steps to family, student, or yourself — track completion.",
    bullets: [
      { label: "Due this week", value: "4" },
      { label: "Overdue", value: "1" },
    ],
    cta: { label: "See Action Items", to: "/educator/action-items" },
  },
  {
    featureId: "calendar",
    icon: CalendarDays,
    title: "Calendar",
    status: "2 this week",
    tone: "muted",
    summary: "Meetings and check-ins across your caseload — one calendar view.",
    bullets: [{ label: "Next 30 days", value: "7" }],
    cta: { label: "Open Calendar", to: "/meetings" },
  },
  {
    featureId: "documents",
    icon: FolderOpen,
    title: "Document Review",
    status: "6 in queue",
    tone: "muted",
    summary: "IEPs, evaluations, and family uploads — organized and reviewable.",
    bullets: [
      { label: "Reviewed today", value: "2" },
      { label: "Awaiting family", value: "1" },
    ],
    cta: { label: "Open Review Queue", to: "/educator/document-review" },
  },
];

/**
 * Educator / Case Manager at-a-glance grid. Every tile:
 *  - has a Preview button that opens the shared EducatorFeatureDrawer
 *    (which owns loading / empty / error / permission / ready variants)
 *  - has a direct link into the full feature workflow
 */
export function EducatorOverviewGrid({ isSample = false }: { isSample?: boolean } = {}) {
  const [openFeature, setOpenFeature] = useState<EducatorFeatureId | null>(null);
  const [state, setState] = useState<EducatorFeatureState>("ready");

  const activeTile = TILES.find((t) => t.featureId === openFeature);

  return (
    <ToolPreviewSection
      eyebrow="Your Caseload Workspace"
      title="Your Caseload, In One View"
      description="Preview any tool inline. Every card explains what it does, what feeds it, and the next step you can take today. You only see the students your role permits."
    >
      <ToolPreviewGrid>
        {TILES.map((tile) => (
          <EducatorTile
            key={tile.featureId}
            tile={tile}
            isSample={isSample}
            onPreview={() => {
              setState(tile.defaultState ?? "ready");
              setOpenFeature(tile.featureId);
            }}
          />
        ))}
        <PartnerNetworkTile role="educator" isSample={isSample} />
      </ToolPreviewGrid>


      <EducatorFeatureDrawer
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
            {(["ready", "loading", "empty", "error", "permission"] as EducatorFeatureState[]).map(
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

function EducatorTile({ tile, onPreview, isSample = false }: { tile: Tile; onPreview: () => void; isSample?: boolean }) {
  const Icon = tile.icon;
  const detail = EDUCATOR_FEATURE_DETAILS[tile.featureId];
  const ctaTo = isSample ? resolveDemoFeatureRoute("educator", tile.featureId) : (tile.cta.to as string);
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
          to={ctaTo}
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

