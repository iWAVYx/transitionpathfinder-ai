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
import {
  EducatorFeatureDrawer,
  type EducatorFeatureState,
} from "@/components/dashboard/educator/EducatorFeatureDrawer";
import {
  EDUCATOR_FEATURE_DETAILS,
  type EducatorFeatureId,
} from "@/lib/demo/educator/feature-details";

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
            onPreview={() => {
              setState(tile.defaultState ?? "ready");
              setOpenFeature(tile.featureId);
            }}
          />
        ))}
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

function EducatorTile({ tile, onPreview }: { tile: Tile; onPreview: () => void }) {
  const Icon = tile.icon;
  const detail = EDUCATOR_FEATURE_DETAILS[tile.featureId];
  return (
    <div className="group relative flex h-full min-h-[17rem] flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span aria-hidden />
        <Pill tone={tile.tone}>{tile.status}</Pill>
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

