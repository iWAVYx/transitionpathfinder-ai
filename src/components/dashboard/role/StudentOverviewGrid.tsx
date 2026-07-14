import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  MessageCircleQuestion,
  Compass,
  ClipboardCheck,
  BookmarkCheck,
  CalendarDays,
  FileText,
  Target,
  FolderOpen,
  ArrowRight,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { toTitleCase } from "@/lib/title-case";
import { ToolPreviewSection, ToolPreviewGrid } from "../ToolPreviewCard";
import { StudentFeatureDrawer } from "@/components/dashboard/student/StudentFeatureDrawer";
import {
  STUDENT_FEATURE_DETAILS,
  type StudentFeatureId,
} from "@/lib/demo/student/feature-details";

type Tile = {
  featureId: StudentFeatureId;
  icon: LucideIcon;
  title: string;
  status: string;
  tone: "default" | "success" | "warning" | "critical" | "muted";
  summary: string;
  bullets?: { label: string; value: string }[];
  cta: { label: string; to: string };
};

const TILES: Tile[] = [
  {
    featureId: "pathway-report",
    icon: Target,
    title: "My Pathway Report",
    status: "Draft · v4",
    tone: "success",
    summary: "Your plan across employment, education, independent living, and advocacy.",
    bullets: [
      { label: "Sections complete", value: "5 of 7" },
      { label: "Last updated", value: "3d ago" },
    ],
    cta: { label: "Open My Report", to: "/pathway/student" },
  },
  {
    featureId: "student-voice",
    icon: MessageCircleQuestion,
    title: "Student Voice",
    status: "4 of 6",
    tone: "warning",
    summary: "Share strengths, interests, and hopes so your team hears from you first.",
    bullets: [
      { label: "Prompts answered", value: "4 of 6" },
      { label: "Last update", value: "Yesterday" },
    ],
    cta: { label: "Answer Prompts", to: "/student-voice" },
  },
  {
    featureId: "action-items",
    icon: ClipboardCheck,
    title: "My Action Items",
    status: "2 due",
    tone: "warning",
    summary: "Small next steps so momentum stays with you, not the paperwork.",
    bullets: [
      { label: "Due this week", value: "2" },
      { label: "Overdue", value: "0" },
    ],
    cta: { label: "Open Action Items", to: "/action-items" },
  },
  {
    featureId: "meeting-prep",
    icon: FileText,
    title: "Meeting Prep",
    status: "Prep Now",
    tone: "default",
    summary: "Walk into your PPT with the questions and goals you want on the table.",
    bullets: [
      { label: "Questions ready", value: "3" },
      { label: "Next meeting", value: "Sep 15" },
    ],
    cta: { label: "Prep For Meeting", to: "/ppt-prep" },
  },
  {
    featureId: "calendar",
    icon: CalendarDays,
    title: "Upcoming Meetings",
    status: "1 this week",
    tone: "muted",
    summary: "PPTs, IEP reviews, tours, and check-ins in one place.",
    bullets: [{ label: "Next 30 days", value: "3" }],
    cta: { label: "Open Calendar", to: "/meetings" },
  },
  {
    featureId: "saved-resources",
    icon: BookmarkCheck,
    title: "Saved Resources",
    status: "5 saved",
    tone: "muted",
    summary: "Guides, checklists, and tools you or your team bookmarked.",
    bullets: [{ label: "Added this month", value: "2" }],
    cta: { label: "Open Saved Resources", to: "/resources/saved" },
  },
  {
    featureId: "documents",
    icon: FolderOpen,
    title: "Documents Shared With Me",
    status: "4 files",
    tone: "muted",
    summary: "IEPs, evaluations, and family notes your team shared with you.",
    bullets: [{ label: "New this month", value: "1" }],
    cta: { label: "Open Documents", to: "/documents" },
  },
];

/**
 * Student at-a-glance workspace tiles. Every tile has a Preview button
 * that opens a shared feature-detail drawer (what it does, current data,
 * next action, and connections), plus a direct route into the full page.
 */
export function StudentOverviewGrid({ isSample = false }: { isSample?: boolean } = {}) {
  const [openFeature, setOpenFeature] = useState<StudentFeatureId | null>(null);
  const activeIcon = TILES.find((t) => t.featureId === openFeature)?.icon;

  return (
    <ToolPreviewSection
      eyebrow="Your Workspace"
      title="Your Plan, One Place"
      description="Preview any tool inline, or open it to keep working. Every card explains what it does, what it uses, and what comes next."
    >
      <ToolPreviewGrid>
        {TILES.map((tile) => (
          <StudentTile
            key={tile.featureId}
            tile={tile}
            onPreview={() => setOpenFeature(tile.featureId)}
          />
        ))}
      </ToolPreviewGrid>

      <StudentFeatureDrawer
        featureId={openFeature}
        icon={activeIcon}
        isSample={isSample}
        onOpenChange={(open) => {
          if (!open) setOpenFeature(null);
        }}
      />
    </ToolPreviewSection>
  );
}

function StudentTile({ tile, onPreview }: { tile: Tile; onPreview: () => void }) {
  const Icon = tile.icon;
  const detail = STUDENT_FEATURE_DETAILS[tile.featureId];
  const toneClass = TONE[tile.tone];
  return (
    <div className="group relative flex h-full min-h-[17rem] flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span aria-hidden />
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider leading-none ring-1 ${toneClass}`}
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
      {detail.stats && detail.stats.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Preview shows: {detail.rows.length} items · {detail.connectsTo.length} connected tools
        </p>
      )}
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
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
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

// Keep the previously used Compass import referenced in case of future extension.
void Compass;
