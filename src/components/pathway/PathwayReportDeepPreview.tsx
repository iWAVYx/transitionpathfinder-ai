import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
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
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { generatePathwayReportPdf } from "@/lib/pathway-pdf.functions";



import {
  getStageDetail,
  type StageDetailGroup,
  type StageDetailPhase,
} from "@/lib/workspace/stage-samples";

/**
 * PathwayReportDeepPreview — full-fidelity, chapter-organized preview
 * of the Pathway Report using the same 17 sections that ship inside the
 * signed-in report. Sample data only.
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

// Shared token utilities so buttons, chips, and labels stay visually consistent.
const EYEBROW =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
const FOCUS_RING =
  "focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const PILL_BASE =
  `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${FOCUS_RING}`;
const PILL_GHOST =
  "border border-border bg-background text-foreground hover:border-primary hover:text-primary";
const PILL_ACTIVE =
  "border border-primary bg-primary text-primary-foreground shadow-sm";


export function PathwayReportDeepPreview() {
  const [audience, setAudience] = useState<Audience>("family");
  const { user, loading: authLoading } = useAuth();
  const isSignedIn = !!user;
  const [status, setStatus] = useState<string>("");
  const detail = getStageDetail("roadmap");
  const groups = detail?.groups ?? [];

  const byTitle = useMemo(() => {
    const map = new Map<string, StageDetailGroup>();
    for (const g of groups) map.set(g.title, g);
    return map;
  }, [groups]);

  const studentVoice = byTitle.get("Student Voice (In Their Own Words)");
  const voiceQuote = studentVoice?.items.find((i) => i.label === "What I Want After School")?.note;

  const generatePdf = useServerFn(generatePathwayReportPdf);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    if (!isSignedIn || downloading) return;
    setDownloading(true);
    setStatus("Generating your PDF…");
    try {
      const result = await generatePdf();
      const binary = atob(result.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("PDF downloaded.");
    } catch (err) {
      console.error(err);
      setStatus("Couldn't generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [isSignedIn, downloading, generatePdf]);

  const handleShare = useCallback(async () => {
    if (!isSignedIn) return;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: "Jordan Rivera's Pathway Report",
      text: "Pathway Report — sample preview from Transition Forward CT.",
      url: shareUrl,
    };
    try {
      const nav = typeof navigator !== "undefined" ? navigator : undefined;
      if (nav && typeof nav.share === "function") {
        await nav.share(shareData);
        setStatus("Share sheet opened.");
        return;
      }
      if (nav && nav.clipboard) {
        await nav.clipboard.writeText(shareUrl);
        setStatus("Report link copied to clipboard.");
        return;
      }
      setStatus("Sharing isn't supported in this browser.");
    } catch (err) {

      // AbortError = user dismissed; treat as silent.
      if ((err as { name?: string })?.name !== "AbortError") {
        setStatus("Couldn't share the report. Try copying the URL from your address bar.");
      }
    }
  }, [isSignedIn]);


  return (
    <section
      aria-labelledby="pathway-report-preview-title"
      className="mt-10 overflow-hidden rounded-3xl border bg-card shadow-soft"
      data-testid="pathway-report-deep-preview"
    >
      {/* Cover */}
      <div className="relative bg-gradient-hero px-6 py-8 sm:px-10 sm:py-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            <p className={`${EYEBROW} flex items-center gap-1.5`}>
              <BookOpen className="h-3 w-3" aria-hidden />
              Pathway Report · Sample Preview
            </p>
            <h2
              id="pathway-report-preview-title"
              className="mt-3 font-display text-3xl leading-tight tracking-tight text-foreground sm:text-4xl"
            >
              Jordan Rivera's Pathway Report
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A full-fidelity preview of the shareable Pathway Report — the same 17 sections signed-in
              families, educators, and students see, rendered here with sample data.
            </p>
            <dl className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <dt className={EYEBROW}>ID</dt>
                <dd className="font-mono uppercase text-foreground">TF-SAMPLE01</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className={EYEBROW}>For</dt>
                <dd className="text-foreground">Jordan Rivera</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className={EYEBROW}>Next Review</dt>
                <dd className="text-foreground">This Spring</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className={EYEBROW}>Version</dt>
                <dd className="text-foreground">3 · Regenerated Today</dd>
              </div>
            </dl>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary ring-1 ring-primary/20">
            <Sparkles className="h-3 w-3" aria-hidden /> Sample Data
          </span>
        </div>

        {voiceQuote && (
          <blockquote className="mt-8 flex items-start gap-4 rounded-2xl border border-primary/20 bg-background/70 p-5 backdrop-blur">
            <Quote className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="font-display text-lg italic leading-snug text-foreground">
                {voiceQuote}
              </p>
              <p className={`mt-2 ${EYEBROW}`}>— Jordan · From The Student Voice Stage</p>
            </div>
          </blockquote>
        )}

        {/* Audience switcher */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <p className={EYEBROW}>Read As</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(AUDIENCE_COPY) as Audience[]).map((a) => {
              const active = audience === a;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAudience(a)}
                  aria-pressed={active}
                  className={`${PILL_BASE} ${active ? PILL_ACTIVE : PILL_GHOST}`}
                >
                  {AUDIENCE_COPY[a].chip}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] leading-relaxed text-muted-foreground sm:max-w-md">
            {AUDIENCE_COPY[audience].lens}
          </span>
        </div>
      </div>

      {/* Chapter nav */}
      <ChapterNav />

      {/* Chapters */}
      <div className="divide-y">
        {CHAPTERS.map((c) => (
          <ChapterBlock
            key={c.id}
            chapter={c}
            sections={
              c.sectionTitles.map((t) => byTitle.get(t)).filter(Boolean) as StageDetailGroup[]
            }
          />
        ))}
      </div>


      {/* Footer actions */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t bg-muted/30 px-6 py-6 sm:px-10">
        <div className="flex min-w-0 flex-col gap-1 sm:max-w-lg">
          <p className="flex items-start gap-2 text-[11px] italic leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            AI-assisted, team-reviewed. Every section cites its source; nothing ships without educator approval.
          </p>
          <p
            role="status"
            aria-live="polite"
            className={`text-[11px] leading-relaxed ${status ? "text-primary" : "text-transparent"}`}
          >
            {status || "\u00A0"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!isSignedIn || authLoading || downloading}
            aria-disabled={!isSignedIn || authLoading || downloading}
            title={isSignedIn ? "Download the report as a PDF" : "Sign in to download the PDF"}
            className={`${PILL_BASE} ${PILL_GHOST} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
            {downloading ? "Generating…" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!isSignedIn || authLoading}
            aria-disabled={!isSignedIn || authLoading}
            title={isSignedIn ? "Share this report securely" : "Sign in to share the report"}
            className={`${PILL_BASE} ${PILL_GHOST} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden /> Share Securely
          </button>
          {!isSignedIn && (
            <Link to="/login" className={`${PILL_BASE} ${PILL_GHOST} no-underline`}>
              Sign In To Enable
            </Link>
          )}
          <Link to="/demo" className={`${PILL_BASE} ${PILL_ACTIVE} no-underline hover:bg-primary/90`}>
            See The Full Demo <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </footer>

    </section>
  );
}

function ChapterNav() {
  const [focusIdx, setFocusIdx] = useState(0);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const focusAt = useCallback((i: number) => {
    const next = (i + CHAPTERS.length) % CHAPTERS.length;
    setFocusIdx(next);
    linkRefs.current[next]?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLAnchorElement>, i: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        focusAt(i + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        focusAt(i - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(CHAPTERS.length - 1);
        break;
    }
  };

  const activate = (id: string) => {
    // Move focus to the chapter heading so screen readers/keyboard users land
    // in the destination content instead of staying on the nav pill.
    const heading = document.getElementById(`report-ch-${id}-heading`);
    if (heading) {
      heading.focus({ preventScroll: false });
    }
  };

  return (
    <nav
      aria-label="Report chapters"
      className="sticky top-0 z-10 border-y bg-card/95 px-4 py-3 backdrop-blur sm:px-6"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className={EYEBROW} id="report-chapter-nav-label">
          Jump To
        </p>
        <div
          role="toolbar"
          aria-labelledby="report-chapter-nav-label"
          aria-orientation="horizontal"
          className="flex flex-wrap gap-1.5"
        >
          {CHAPTERS.map((c, i) => (
            <a
              key={c.id}
              ref={(el) => {
                linkRefs.current[i] = el;
              }}
              href={`#report-ch-${c.id}`}
              tabIndex={i === focusIdx ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, i)}
              onFocus={() => setFocusIdx(i)}
              onClick={() => activate(c.id)}
              aria-label={`Jump to Chapter ${c.number}: ${c.title}`}
              className={`${PILL_BASE} ${PILL_GHOST} no-underline`}
            >
              <span
                aria-hidden
                className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary"
              >
                {c.number}
              </span>
              <span>{c.title}</span>
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

function ChapterBlock({ chapter, sections }: { chapter: Chapter; sections: StageDetailGroup[] }) {
  const Icon = chapter.icon;
  const headingId = `report-ch-${chapter.id}-heading`;
  return (
    <section
      id={`report-ch-${chapter.id}`}
      aria-labelledby={headingId}
      className="scroll-mt-24 px-6 py-10 sm:px-10 sm:py-12"
    >
      <header className="flex items-center gap-4 border-b border-border/60 pb-5">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className={EYEBROW}>{chapter.eyebrow}</p>
          <h3
            id={headingId}
            tabIndex={-1}
            className={`mt-1 font-display text-2xl font-medium leading-tight tracking-tight text-foreground rounded-sm ${FOCUS_RING}`}
          >
            {chapter.title}
          </h3>
        </div>
      </header>

      <ul
        role="list"
        aria-label={`${chapter.title} sections`}
        className="mt-6 grid gap-5 md:grid-cols-2"
      >
        {sections.map((s) => (
          <li key={s.title} className="list-none">
            <SectionCard group={s} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionCard({ group }: { group: StageDetailGroup }) {
  const phase = group.phase ?? "input";
  const titleId = useId();
  const descId = useId();
  return (
    <article
      tabIndex={0}
      aria-labelledby={titleId}
      aria-describedby={group.description ? descId : undefined}
      className={`flex h-full flex-col rounded-2xl border bg-background p-6 shadow-soft transition-colors hover:border-primary/40 focus-visible:border-primary ${FOCUS_RING}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ${PHASE_TONE[phase]}`}
        >
          <span className="sr-only">Phase: </span>
          {PHASE_LABEL[phase]}
        </span>
      </div>
      <h4
        id={titleId}
        className="mt-3 font-display text-base font-semibold leading-snug tracking-tight text-foreground"
      >
        {group.title}
      </h4>
      {group.description && (
        <p id={descId} className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {group.description}
        </p>
      )}
      <ul className="mt-4 space-y-3 text-xs">
        {group.items.map((it, i) => (
          <li
            key={i}
            className="flex flex-col gap-1 border-b border-dashed border-border/60 pb-3 last:border-b-0 last:pb-0"
          >
            <span className="font-semibold leading-snug text-foreground">{it.label}</span>
            {it.note && (
              <span className="leading-relaxed text-muted-foreground">{it.note}</span>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}

