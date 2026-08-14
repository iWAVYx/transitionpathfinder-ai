import { Link } from "@tanstack/react-router";
import {
  Compass,
  Sparkles,
  Target,
  BookOpen,
  Quote,
  ArrowRight,
} from "lucide-react";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";


/**
 * Student-lens preview of the Pathway Report sections.
 * Renders the same content shape produced by the v2 report generator
 * (Snapshot, Voice, SPIN, Readiness, Recommended Pathway, Career /
 * Life Matches) reframed in the student's own reading level.
 *
 * Sample fallback data ships inline so the dashboard has meaningful
 * previews before a report has been generated. When `data` is provided
 * (from a real PathwayReport v2), it overrides the sample copy.
 */

type ReadinessLevel = "emerging" | "developing" | "progressing" | "ready";

export interface StudentPathwaySectionsData {
  snapshot?: {
    headline?: string;
    grade?: string;
    school?: string;
    caseManager?: string;
  };
  voiceQuote?: string;
  strengths?: string[];
  interests?: string[];
  readiness?: { domain: string; level: ReadinessLevel; note?: string }[];
  recommendedPathway?: {
    title: string;
    summary: string;
    why: string;
    nextStep: string;
  };
  careerMatches?: { title: string; why: string }[];
  reportHref?: string;
}

const SAMPLE: Required<StudentPathwaySectionsData> = {
  snapshot: {
    headline: "College + Work direction with a design focus",
    grade: "Grade 11",
    school: "Riverbend High",
    caseManager: "Ms. Nguyen",
  },
  voiceQuote:
    "I'm good at noticing details and being patient with younger kids. I want to keep learning — maybe work with animals someday.",
  strengths: ["Visual memory", "Pattern-spotting", "Patient with peers"],
  interests: ["Game design", "Animals", "Music production"],
  readiness: [
    { domain: "Academic", level: "progressing", note: "Strongest in Art + CS" },
    { domain: "Self-Advocacy", level: "developing", note: "Building with practice" },
    { domain: "Independent Living", level: "emerging", note: "Travel + budgeting focus" },
    { domain: "Career Awareness", level: "developing", note: "Portfolio started" },
    { domain: "Postsecondary", level: "progressing", note: "Two programs shortlisted" },
  ],
  recommendedPathway: {
    title: "TransitionForward · College + Work",
    summary: "A 2-year design or CS program paired with a paid internship.",
    why: "Matches your voice, your strongest classes, and what your family cares about.",
    nextStep: "Book a campus tour and finish your Voice prompts before the next meeting.",
  },
  careerMatches: [
    { title: "UX Assistant", why: "Design interest + your eye for detail." },
    { title: "Library Aide", why: "Quiet, structured, community-facing." },
    { title: "Peer Mentor", why: "You're patient with younger kids." },
    { title: "Animal Shelter Volunteer", why: "Direct match to what you shared." },
  ],
  reportHref: "/reports",
};

const LEVEL_STYLES: Record<ReadinessLevel, string> = {
  emerging: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  developing: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
  progressing: "bg-primary/10 text-primary ring-primary/20",
  ready: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
};

const LEVEL_LABEL: Record<ReadinessLevel, string> = {
  emerging: "Emerging",
  developing: "Developing",
  progressing: "Progressing",
  ready: "Ready",
};

export function StudentPathwaySections({
  data,
  isSample = true,
  empty = false,
}: {
  data?: StudentPathwaySectionsData;
  /** Renders a "Sample Data" chip in the header. */
  isSample?: boolean;
  /** When true, render the unified empty state instead of report sections. */
  empty?: boolean;
}) {
  const d: Required<StudentPathwaySectionsData> = {
    ...SAMPLE,
    ...data,
    snapshot: { ...SAMPLE.snapshot, ...(data?.snapshot ?? {}) },
    recommendedPathway: {
      ...SAMPLE.recommendedPathway,
      ...(data?.recommendedPathway ?? {}),
    },
  };


  return (
    <section
      aria-labelledby="student-pathway-sections-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="student-pathway-sections"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow">Your Pathway Report — Student View</p>
          <h2
            id="student-pathway-sections-title"
            className="mt-1 font-display text-2xl font-medium tracking-tight"
          >
            Your Plan, In Your Words
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The same report your family and team see — reframed for you. Every
            section is drawn from what you shared and what's on file.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSample && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20"
              aria-label="Sample data preview"
            >
              <Sparkles className="h-3 w-3" aria-hidden /> Sample Preview
            </span>
          )}
          <Link
            to={d.reportHref}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:border-primary hover:bg-primary/10"
          >
            Open Full Report <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      {empty ? (
        <ModuleEmptyState
          kind="reports"
          eyebrow="Pathway Report"
          title="Your Pathway Report Is Almost Ready"
          description="Add a few Student Voice answers and upload the most recent evaluation — we'll draft your Pathway Report the moment there's enough evidence."
          primaryAction={{ label: "Start Student Voice", to: "/student-voice" }}
          secondaryAction={{ label: "Upload A Document", to: "/documents" }}
          className="mt-6"
        />
      ) : (
      <>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Snapshot */}


        <div className="rounded-2xl border bg-background p-4">
          <p className="tf-eyebrow">Student Snapshot</p>
          <h3 className="mt-1 font-display text-base font-medium tracking-tight">
            {d.snapshot.headline}
          </h3>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <SnapshotBit label="Grade" value={d.snapshot.grade} />
            <SnapshotBit label="School" value={d.snapshot.school} />
            <SnapshotBit label="Case Mgr." value={d.snapshot.caseManager} />
          </dl>
        </div>

        {/* Voice quote */}
        <div className="rounded-2xl border bg-background p-4">
          <p className="tf-eyebrow flex items-center gap-1">
            <Quote className="h-3 w-3" aria-hidden /> In Your Own Words
          </p>
          <blockquote className="mt-2 border-l-2 border-primary/40 pl-3 text-sm italic leading-relaxed text-foreground/90">
            "{d.voiceQuote}"
          </blockquote>
        </div>

        {/* Strengths + Interests */}
        <div className="rounded-2xl border bg-background p-4">
          <p className="tf-eyebrow flex items-center gap-1">
            <Sparkles className="h-3 w-3" aria-hidden /> Strengths + Interests
          </p>
          <div className="mt-3 space-y-3 text-xs">
            <TagRow label="Strengths" items={d.strengths} />
            <TagRow label="Interests" items={d.interests} />
          </div>
        </div>

        {/* Readiness scorecard */}
        <div className="rounded-2xl border bg-background p-4">
          <p className="tf-eyebrow flex items-center gap-1">
            <Target className="h-3 w-3" aria-hidden /> Readiness Scorecard
          </p>
          <ul className="mt-3 space-y-2">
            {d.readiness.map((r) => (
              <li
                key={r.domain}
                className="flex items-center justify-between gap-2 border-b border-dashed border-border/60 pb-2 text-xs last:border-b-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{r.domain}</p>
                  {r.note && (
                    <p className="text-[11px] text-muted-foreground">{r.note}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${LEVEL_STYLES[r.level]}`}
                >
                  {LEVEL_LABEL[r.level]}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended pathway */}
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 lg:col-span-2">
          <p className="tf-eyebrow tf-eyebrow--contrast flex items-center gap-1">
            <Compass className="h-3 w-3" aria-hidden /> Recommended Pathway
          </p>
          <h3 className="mt-1 font-display text-lg font-medium tracking-tight">
            {d.recommendedPathway.title}
          </h3>
          <p className="mt-1 text-sm text-foreground/90">
            {d.recommendedPathway.summary}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-background/70 p-3 text-xs">
              <p className="font-semibold text-foreground">Why This Fits You</p>
              <p className="mt-1 text-muted-foreground">
                {d.recommendedPathway.why}
              </p>
            </div>
            <div className="rounded-xl bg-background/70 p-3 text-xs">
              <p className="font-semibold text-foreground">Your Next Step</p>
              <p className="mt-1 text-muted-foreground">
                {d.recommendedPathway.nextStep}
              </p>
            </div>
          </div>
        </div>

        {/* Career + Life matches */}
        <div className="rounded-2xl border bg-background p-4 lg:col-span-2">
          <p className="tf-eyebrow flex items-center gap-1">
            <BookOpen className="h-3 w-3" aria-hidden /> Career + Life Matches
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {d.careerMatches.map((m) => (
              <li
                key={m.title}
                className="rounded-xl border bg-card p-3 text-xs shadow-soft"
              >
                <p className="font-semibold text-foreground">{m.title}</p>
                <p className="mt-0.5 text-muted-foreground">{m.why}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-5 text-[11px] italic leading-relaxed text-muted-foreground">
        AI-assisted — your team reviews everything here before it's shared. You
        can always update your Voice or ask a question at your next meeting.
      </p>
      </>
      )}
    </section>

  );
}

function SnapshotBit({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

function TagRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((it) => (
          <li
            key={it}
            className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground"
          >
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
