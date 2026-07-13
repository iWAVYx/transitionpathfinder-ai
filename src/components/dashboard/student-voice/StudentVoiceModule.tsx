import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Target,
  Sparkles as SparklesIcon,
  Star,
  TrendingUp,
  ListChecks,
  ArrowRight,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { toTitleCase } from "@/lib/title-case";
import { ToolPreviewSection, ToolPreviewGrid } from "../ToolPreviewCard";
import {
  StudentVoiceFeatureDrawer,
  type StudentVoiceFeatureState,
} from "./StudentVoiceFeatureDrawer";
import {
  STUDENT_VOICE_FEATURE_DETAILS,
  type StudentVoiceFeatureId,
} from "@/lib/demo/student-voice/feature-details";

type Tile = {
  featureId: StudentVoiceFeatureId;
  icon: LucideIcon;
  title: string;
  status: string;
  tone: "default" | "success" | "warning" | "critical" | "muted";
  summary: string;
  bullets?: { label: string; value: string }[];
  cta: { label: string; to: string };
  defaultState?: StudentVoiceFeatureState;
};

const TILES: Tile[] = [
  {
    featureId: "goals",
    icon: Target,
    title: "My Goals",
    status: "4 goals",
    tone: "default",
    summary: "What you want after high school — jobs, learning, living, community.",
    bullets: [
      { label: "Top priority", value: "1" },
      { label: "Updated", value: "This week" },
    ],
    cta: { label: "Open My Goals", to: "/student-voice" },
  },
  {
    featureId: "preferences",
    icon: SparklesIcon,
    title: "My Preferences",
    status: "6 set",
    tone: "success",
    summary: "How you learn, work, and want to be supported — matched to the plan.",
    bullets: [
      { label: "Categories", value: "3" },
      { label: "Shared", value: "Team" },
    ],
    cta: { label: "Open Preferences", to: "/student-voice" },
  },
  {
    featureId: "strengths",
    icon: Star,
    title: "My Strengths",
    status: "7 listed",
    tone: "success",
    summary: "Things you're good at, in your words and observed by trusted adults.",
    bullets: [
      { label: "My words", value: "4" },
      { label: "Educator-observed", value: "3" },
    ],
    cta: { label: "Open Strengths", to: "/student-voice" },
  },
  {
    featureId: "progress",
    icon: TrendingUp,
    title: "My Progress",
    status: "12 of 18",
    tone: "warning",
    summary: "How your Voice has grown across employment, learning, living, and self-advocacy.",
    bullets: [
      { label: "This month", value: "+4" },
      { label: "Domains", value: "4 of 4" },
    ],
    cta: { label: "Open Progress", to: "/student-voice" },
  },
  {
    featureId: "next-step",
    icon: ListChecks,
    title: "Next-Step Capture",
    status: "3 open",
    tone: "default",
    summary: "Turn a goal or strength into one small action you can actually do.",
    bullets: [
      { label: "Owned by me", value: "2" },
      { label: "Due this month", value: "1" },
    ],
    cta: { label: "Draft A Next Step", to: "/action-items" },
  },
];

/**
 * Student Voice dashboard module. Five tiles — goals, preferences, strengths,
 * progress, next-step capture — each with a Preview drawer and a direct
 * jump into the Student Voice / Action Items workflows. Uses the same
 * tile + drawer contract as the role dashboards. All data private to the
 * student and whoever they've shared with.
 */
export function StudentVoiceModule({ isSample = false }: { isSample?: boolean } = {}) {
  const [openFeature, setOpenFeature] = useState<StudentVoiceFeatureId | null>(null);
  const [state, setState] = useState<StudentVoiceFeatureState>("ready");

  const activeTile = TILES.find((t) => t.featureId === openFeature);

  return (
    <ToolPreviewSection
      eyebrow="Student Voice"
      title="Your Words, Turned Into A Plan"
      description="Capture what you want, how you work, and what you're good at — then turn one thing into a next step. Private to you and the people you've shared with."
    >
      <ToolPreviewGrid>
        {TILES.map((tile) => (
          <StudentVoiceTile
            key={tile.featureId}
            tile={tile}
            onPreview={() => {
              setState(tile.defaultState ?? "ready");
              setOpenFeature(tile.featureId);
            }}
          />
        ))}
      </ToolPreviewGrid>

      <StudentVoiceFeatureDrawer
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
            {(["ready", "loading", "empty", "error", "permission"] as StudentVoiceFeatureState[]).map(
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

function StudentVoiceTile({ tile, onPreview }: { tile: Tile; onPreview: () => void }) {
  const Icon = tile.icon;
  const detail = STUDENT_VOICE_FEATURE_DETAILS[tile.featureId];
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
