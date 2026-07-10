import { useMemo, useState } from "react";
import {
  BookOpen,
  Sparkles,
  UserCircle2,
  FolderCheck,
  Compass,
  Handshake,
  ListChecks,
  ArrowRight,
  Printer,
  Share2,
  Quote,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import {
  getStageDetail,
  type StageDetailGroup,
  type StageDetailPhase,
} from "@/lib/workspace/stage-samples";

/**
 * PathwayReportDeepPreview — full-fidelity, chapter-organized preview
 * of the Pathway Report using the same 17 sections that ship inside the
 * signed-in report. Sample data only. Mounted below the Roadmap stage
 * in the public demo Workspace Tour so the demo isn't a lighter shell
 * than the signed-in product.
 */

type Audience = "student" | "family" | "educator";

interface Chapter {
  id: string;
  number: number;
  title: string;
  eyebrow: string;
  icon: typeof BookOpen;
  sectionTitles: string[];
}

const CHAPTERS: Chapter[] = [
  {
    id: "who",
    number: 1,
    title: "Who We're Planning With",
    eyebrow: "Chapter 1",
    icon: UserCircle2,
    sectionTitles: [
      "Student Snapshot",
      "Student Voice (In Their Own Words)",
      "Family Priorities",
      "Educator Insights",
    ],
  },
  {
    id: "gathered",
    number: 2,
    title: "What We've Gathered",
    eyebrow: "Chapter 2",
    icon: FolderCheck,
    sectionTitles: [
      "Documents and Evidence",
      "Readiness Scorecard",
      "IEP + Transition Translator",
      "Data Gaps + Needs Review",
    ],
  },
  {
    id: "where",
    number: 3,
    title: "Where We're Going",
    eyebrow: "Chapter 3",
    icon: Compass,
    sectionTitles: [
      "Executive Summary",
      "Recommended Pathways",
      "Career and Life Matches",
    ],
  },
  {
    id: "how",
    number: 4,
    title: "How We Get There",
    eyebrow: "Chapter 4",
    icon: Handshake,
    sectionTitles: [
      "Recommended Resources",
      "Partner Matches (Where Consent Allows)",
      "Meeting Prep Questions",
    ],
  },
  {
    id: "action",
    number: 5,
    title: "The Action Plan",
    eyebrow: "Chapter 5",
    icon: ListChecks,
    sectionTitles: [
      "Role-Specific Views",
      "30 / 90 / 180 / 365-Day Next Steps",
      "Source Notes + AI Disclaimer",
    ],
  },
];

const PHASE_TONE: Record<StageDetailPhase, string> = {
  input: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
  insight: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  pathway: "bg-primary/10 text-primary ring-primary/20",
  action: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
};

const PHASE_LABEL: Record<StageDetailPhase, string> = {
  input: "Input",
  insight: "Insight",
  pathway: "Pathway",
  action: "Action",
};

const AUDIENCE_COPY: Record<Audience, { chip: string; lens: string }> = {
  student: {
    chip: "Student View",
    lens: "Plain language, strengths-first. The one-page summary you can read before the meeting.",
  },
  family: {
    chip: "Family View",
    lens: "Meeting-ready, with your priorities up front and consent controls one click away.",
  },
  educator: {
    chip: "Educator View",
    lens: "IDEA-aligned, citation-trail visible, PPT agenda auto-drafted from this document.",
  },
};

export function PathwayReportDeepPreview() {
  const [audience, setAudience] = useState<Audience>("family");
  const detail = getStageDetail("roadmap");
  const groups = detail?.groups ?? [];

  const byTitle = useMemo(() => {
    const map = new Map<string, StageDetailGroup>();
    for (const g of groups) map.set(g.title, g);
    return map;
  }, [groups]);

  const studentVoice = byTitle.get("Student Voice (In Their Own Words)");
  const voiceQuote = studentVoice?.items.find((i) => i.label === "What I Want After School")?.note;

  return (
    <section
      aria-labelledby="pathway-report-preview-title"
      className="mt-10 overflow-hidden rounded-3xl border bg-card shadow-soft"
      data-testid="pathway-report-deep-preview"
    >
      {/* Cover */}
      <div className="relative bg-gradient-hero p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="tf-eyebrow flex items-center gap-1.5">
              <BookOpen className="h-3 w-3" aria-hidden />
              Pathway Report · Sample Preview
            </p>
            <h2
              id="pathway-report-preview-title"
              className="mt-2 font-display text-3xl tracking-tight text-foreground sm:text-4xl"
            >
              Jordan Rivera's Pathway Report
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              A full-fidelity preview of the shareable Pathway Report — the same 17 sections signed-in
              families, educators, and students see, rendered here with sample data.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span>Report ID · <span className="font-mono uppercase">TF-SAMPLE01</span></span>
              <span aria-hidden>·</span>
              <span>Prepared For Jordan Rivera</span>
              <span aria-hidden>·</span>
              <span>Next Review · This Spring</span>
              <span aria-hidden>·</span>
              <span>Version 3 · Regenerated Today</span>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
            <Sparkles className="h-3 w-3" aria-hidden /> Sample Data
          </span>
        </div>

        {voiceQuote && (
          <blockquote className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-background/70 p-4 backdrop-blur">
            <Quote className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="font-display text-lg italic leading-snug text-foreground">
                {voiceQuote}
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                — Jordan · From The Student Voice Stage
              </p>
            </div>
          </blockquote>
        )}

        {/* Audience switcher */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Read As:
          </p>
          {(Object.keys(AUDIENCE_COPY) as Audience[]).map((a) => {
            const active = audience === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => setAudience(a)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary/30 bg-background text-primary hover:bg-primary/10"
                }`}
              >
                {AUDIENCE_COPY[a].chip}
              </button>
            );
          })}
          <span className="text-[11px] text-muted-foreground">{AUDIENCE_COPY[audience].lens}</span>
        </div>
      </div>

      {/* Chapter nav */}
      <nav
        aria-label="Report chapters"
        className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-y bg-card/95 px-4 py-3 backdrop-blur sm:px-6"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Jump To:
        </p>
        {CHAPTERS.map((c) => {
          const Icon = c.icon;
          return (
            <a
              key={c.id}
              href={`#report-ch-${c.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground no-underline transition-colors hover:border-primary hover:text-primary"
            >
              <Icon className="h-3 w-3" aria-hidden /> Ch. {c.number} · {c.title}
            </a>
          );
        })}
      </nav>

      {/* Chapters */}
      <div className="divide-y">
        {CHAPTERS.map((c) => (
          <ChapterBlock key={c.id} chapter={c} sections={c.sectionTitles.map((t) => byTitle.get(t)).filter(Boolean) as StageDetailGroup[]} />
        ))}
      </div>

      {/* Footer actions */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-6 py-5 sm:px-10">
        <p className="flex items-center gap-1.5 text-[11px] italic text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          AI-assisted, team-reviewed. Every section cites its source; nothing ships without educator approval.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            disabled
            aria-disabled
            title="Available in the signed-in product"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden /> Download PDF
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            disabled
            aria-disabled
            title="Available in the signed-in product"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden /> Share Securely
          </button>
          <Link
            to="/demo"
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground no-underline transition-colors hover:bg-primary/90"
          >
            See The Full Demo <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </footer>
    </section>
  );
}

function ChapterBlock({ chapter, sections }: { chapter: Chapter; sections: StageDetailGroup[] }) {
  const Icon = chapter.icon;
  return (
    <section id={`report-ch-${chapter.id}`} className="scroll-mt-24 px-6 py-8 sm:px-10 sm:py-10">
      <header className="flex items-center gap-3 border-b border-border/60 pb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="tf-eyebrow">{chapter.eyebrow}</p>
          <h3 className="mt-0.5 font-display text-2xl font-medium tracking-tight text-foreground">
            {chapter.title}
          </h3>
        </div>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <SectionCard key={s.title} group={s} />
        ))}
      </div>
    </section>
  );
}

function SectionCard({ group }: { group: StageDetailGroup }) {
  const phase = group.phase ?? "input";
  return (
    <article className="flex h-full flex-col rounded-2xl border bg-background p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${PHASE_TONE[phase]}`}>
          {PHASE_LABEL[phase]}
        </span>
      </div>
      <h4 className="mt-2 font-display text-base font-semibold tracking-tight text-foreground">
        {group.title}
      </h4>
      {group.description && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{group.description}</p>
      )}
      <ul className="mt-3 space-y-2 text-xs">
        {group.items.map((it, i) => (
          <li
            key={i}
            className="flex flex-col gap-0.5 border-b border-dashed border-border/60 pb-2 last:border-b-0 last:pb-0"
          >
            <span className="font-medium text-foreground">{it.label}</span>
            {it.note && <span className="text-muted-foreground">{it.note}</span>}
          </li>
        ))}
      </ul>
    </article>
  );
}
