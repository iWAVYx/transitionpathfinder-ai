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
import { Pill } from "@/components/ui/pill";
import { ToolPreviewSection, ToolPreviewGrid } from "../ToolPreviewCard";
import { StudentFeatureDrawer } from "@/components/dashboard/student/StudentFeatureDrawer";
import {
  STUDENT_FEATURE_DETAILS,
  type StudentFeatureId,
} from "@/lib/demo/student/feature-details";
import { resolveDemoFeatureRoute } from "@/lib/demo/feature-routes";

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
            isSample={isSample}
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

function StudentTile({ tile, onPreview, isSample = false }: { tile: Tile; onPreview: () => void; isSample?: boolean }) {
  const Icon = tile.icon;
  const detail = STUDENT_FEATURE_DETAILS[tile.featureId];
  const ctaTo = isSample ? resolveDemoFeatureRoute("student", tile.featureId) : (tile.cta.to as string);
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
      {detail.stats && detail.stats.length > 0 && (
        <p className="mt-2 px-3.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground/80">
          {detail.rows.length} items · {detail.connectsTo.length} connected
        </p>
      )}
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
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}


// Keep the previously used Compass import referenced in case of future extension.
void Compass;
