import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Download,
  BookmarkPlus,
  Users,
  GraduationCap,
  Check,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Quote,
  Compass,
  Target,
  Map as MapIcon,
  ListChecks,
  Calendar,
  Briefcase,
  HeartHandshake,
  MessageSquareQuote,
  BookOpen,
  Lightbulb,
  Route as RouteIcon,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Search,
  RefreshCw,
} from "lucide-react";
import type { PathwayReport } from "@/lib/pathway.functions";
import type { SupportedLanguage } from "@/lib/ai-assist.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AIDisclaimer } from "@/components/site/AIDisclaimer";
import { AiAssistPanel } from "@/components/pathway/AiAssistPanel";
import { ReportPartnerSuggestions } from "@/components/pathway/ReportPartnerSuggestions";
import { ConnectToPlan } from "@/components/pathway/ConnectToPlan";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  getReportViewerPrefs,
  updateReportViewerPrefs,
} from "@/lib/ui-prefs.functions";
import {
  getStudentVoiceResponses,
  type StudentVoiceResponse,
} from "@/lib/student-voice.functions";
import { STUDENT_VOICE_PROMPTS } from "@/lib/student-voice-prompts";
import {
  EVT_BLOCKS_HYDRATE,
  EVT_DENSITY_SET,
  EVT_OUTLINE_SET,
  configureReportPrefsPusher,
  flushReportPrefs,
  queueReportPrefsUpdate,
  resetCollapsedBlocks,
  setBlockCollapsed,
  type CollapsedBlocksHydrationDetail,
  type DensitySetDetail,
  type OutlineSetDetail,
} from "@/lib/report-view-prefs";

import { toTitleCase } from "@/lib/title-case";
import { HORIZON_META, buildExtendedPlansFromReport, type PlanHorizon } from "@/lib/demo-extended-plans";
import { PlanHorizonTabs, RichPlanStepCard } from "@/components/pathway/PlanHorizon";
import {
  ReportPhase4Sections,
  getPhase4TocItems,
} from "@/components/pathway/ReportPhase4Sections";
import { ValueCallout } from "@/components/value/ValueCallout";
import { CHAPTER_VALUE_DEFAULTS } from "@/lib/value-lens";
import { ReportPartOpener } from "@/components/pathway/ReportPartOpener";
import { PathwayReportBody } from "@/components/pathway/report/PathwayReportBody";
import { OpportunityPipelineSummary } from "@/components/opportunities/OpportunityPipelineSummary";
import {
  PublicationPage,
  PublicationSpread,
  PublicationPullQuote,
  PublicationSidebar,
  PublicationCallout,
  PublicationChecklist,
  PublicationSource,
} from "@/components/publication/PublicationPage";
import { resolveReportAudience } from "@/lib/report-role-precedence";



type Audience = "student" | "family" | "educator";

const READINESS_PCT: Record<string, number> = {
  emerging: 20,
  developing: 45,
  progressing: 70,
  ready: 92,
};

const READINESS_LABEL: Record<string, string> = {
  emerging: "Emerging",
  developing: "Developing",
  progressing: "Progressing",
  ready: "Ready",
};

const PATHWAY_TYPE_LABEL: Record<string, string> = {
  "best-fit": "Best fit",
  backup: "Backup",
  exploration: "Exploration",
  stretch: "Stretch",
  "support-needed": "Support needed",
};

const TIMELINE_STATUS_LABEL: Record<string, string> = {
  complete: "Complete",
  "in-progress": "In progress",
  upcoming: "Upcoming",
  future: "Future",
};

export type ReportMeta = {
  reportId?: string;
  preparedFor?: string;
  preparedBy?: string;
  issued?: string;
  version?: string;
  confidentiality?: string;
  nextReviewDate?: string | null;
  lastUpdated?: string | null;
  school?: string | null;
  graduationYear?: string | number | null;
};

export function ReportView({
  name,
  report,
  onReset,
  resetLabel = "Create another report",
  initialAudience,
  onSaveToProfile,
  saveLabel,
  saved,
  demo = false,
  meta,
  studentId,
  extendedPlans,
  hasV2 = false,
  onAudienceChange,
  onRefresh,
  refreshing = false,
  demoStudentId,
}: {
  name: string;
  report: PathwayReport;
  onReset?: () => void;
  resetLabel?: string;
  initialAudience?: Audience;
  onSaveToProfile?: () => void;
  saveLabel?: string;
  saved?: boolean;
  demo?: boolean;
  meta?: ReportMeta;
  studentId?: string;
  extendedPlans?: import("@/lib/demo-extended-plans").ExtendedPlans;
  /**
   * When the report has been regenerated into the v2 schema, the route also
   * renders <ReportV2Sections />. Set this to suppress the v1 sections that
   * v2 re-renders (IEP translator, family/educator action plans, meeting
   * prep toolkit, opportunity matches) so the document doesn't duplicate.
   */
  hasV2?: boolean;
  /** Notify caller when the user switches audience tabs (for v2 sections). */
  onAudienceChange?: (a: Audience) => void;
  /** Inline "Refresh report" action in the toolbar. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** When set (demo only), render Phase 4 sections derived from demo extras. */
  demoStudentId?: import("@/lib/demo-data").DemoStudentId;
}) {

  // Workstream 1 (verified): Pathway Report audience precedence.
  // Order = 1) explicit ?view=/?audience= in URL, 2) authorized origin
  // (initialAudience passed by caller — dashboard route, share token, etc.),
  // 3) Student View fallback. Centralized in resolveReportAudience so every
  // entry point (dashboard, share, demo) applies the same rules and invalid
  // values fall through safely instead of leaking into state.
  const initialResolved = useMemo(() => {
    let urlAudience: Audience | null = null;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("view") ?? params.get("audience");
      if (raw === "student" || raw === "family" || raw === "educator") {
        urlAudience = raw;
      }
    }
    return resolveReportAudience([urlAudience, initialAudience]);
  }, [initialAudience]);
  const [audience, setAudienceState] = useState<Audience>(initialResolved);
  const setAudience = (a: Audience, options?: { syncUrl?: boolean }) => {
    setAudienceState(a);
    onAudienceChange?.(a);
    if (options?.syncUrl && typeof window !== "undefined" && !onAudienceChange) {
      const url = new URL(window.location.href);
      url.searchParams.set("view", a);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const [copied, setCopied] = useState(false);
  const [displayReport, setDisplayReport] = useState<PathwayReport>(report);
  const [translatedTo, setTranslatedTo] = useState<SupportedLanguage | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [parallaxY, setParallaxY] = useState(0);
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const { user } = useAuth();
  const fetchPrefs = useServerFn(getReportViewerPrefs);
  const pushPrefs = useServerFn(updateReportViewerPrefs);

  /**
   * "Download as PDF" — renders the magazine-handbook reader view rather
   * than the plain document print. Adds `print-magazine` to <body> so the
   * scoped print CSS below preserves chapter openers, paper sheets, pull
   * quotes, and editorial typography. Cleans up after the print dialog.
   */
  const downloadMagazinePdf = useCallback(() => {
    if (typeof window === "undefined") return;
    document.body.classList.add("print-magazine");
    const cleanup = () => {
      document.body.classList.remove("print-magazine");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    // Allow the class to apply before invoking the print dialog.
    window.setTimeout(() => window.print(), 60);
  }, []);

  // Phase 6D — fetch the student's saved voice answers so the Student
  // audience tab can show "Your Voice in this plan" with their own words.
  const fetchVoice = useServerFn(getStudentVoiceResponses);
  const [voiceResponses, setVoiceResponses] = useState<StudentVoiceResponse[]>([]);
  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    fetchVoice({ data: { studentId } })
      .then((r) => {
        if (!cancelled) setVoiceResponses(r.responses ?? []);
      })
      .catch(() => {
        if (!cancelled) setVoiceResponses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, fetchVoice]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("tf.reportDensity");
    if (stored === "compact" || stored === "comfortable") setDensity(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("tf.reportDensity", density);
    window.dispatchEvent(
      new CustomEvent<DensitySetDetail>(EVT_DENSITY_SET, { detail: { density } }),
    );
  }, [density]);

  // Listen for server-pushed density hydration.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DensitySetDetail>).detail;
      if (detail?.density === "compact" || detail?.density === "comfortable") {
        setDensity(detail.density);
      }
    };
    window.addEventListener(EVT_DENSITY_SET, handler as EventListener);
    return () =>
      window.removeEventListener(EVT_DENSITY_SET, handler as EventListener);
  }, []);

  // Configure the debounced server pusher, then hydrate once from server.
  useEffect(() => {
    if (!user) return;
    configureReportPrefsPusher((patch) => pushPrefs({ data: patch }));
    let cancelled = false;
    fetchPrefs()
      .then((prefs) => {
        if (cancelled || !prefs) return;
        if (prefs.density) {
          window.dispatchEvent(
            new CustomEvent<DensitySetDetail>(EVT_DENSITY_SET, {
              detail: { density: prefs.density },
            }),
          );
        }
        if (typeof prefs.outline_open === "boolean") {
          window.dispatchEvent(
            new CustomEvent<OutlineSetDetail>(EVT_OUTLINE_SET, {
              detail: { open: prefs.outline_open },
            }),
          );
        }
        if (Array.isArray(prefs.collapsed_blocks)) {
          resetCollapsedBlocks(prefs.collapsed_blocks);
          window.dispatchEvent(
            new CustomEvent<CollapsedBlocksHydrationDetail>(
              EVT_BLOCKS_HYDRATE,
              { detail: { collapsedIds: prefs.collapsed_blocks } },
            ),
          );
        }
      })
      .catch(() => {
        /* offline / unauthenticated — localStorage cache stands */
      });
    return () => {
      cancelled = true;
      flushReportPrefs();
    };
  }, [user, fetchPrefs, pushPrefs]);


  // Mirror user-driven density changes to the server (skips initial mount).
  const densityHydrated = useRef(false);
  useEffect(() => {
    if (!densityHydrated.current) {
      densityHydrated.current = true;
      return;
    }
    queueReportPrefsUpdate({ density });
  }, [density]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = headerRef.current?.getBoundingClientRect();
        if (!rect) return;
        // gentle parallax only while header is on/near screen
        const offset = Math.max(-160, Math.min(160, -rect.top * 0.18));
        setParallaxY(offset);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view") ?? params.get("audience");
    if (v === "student" || v === "family" || v === "educator") setAudienceState(v);
  }, []);

  const heading = useMemo(
    () =>
      audience === "family"
        ? `A plan for ${name}.`
        : audience === "student"
          ? `Your plan, ${name}.`
          : `PPT Prep packet — ${name}`,
    [audience, name],
  );

  const subheading =
    audience === "family"
      ? displayReport.summary
      : audience === "student"
        ? "A plain-language plan written for you. Use it to see what's next, what you're good at, and what to ask your team about."
        : "A teacher-facing snapshot to bring to the next Planning & Placement Team meeting. Use the talking points and next steps to keep the conversation focused on the student.";

  const copyLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const shareReport = async () => {
    if (typeof window === "undefined") return;
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({
          title: `${name} — Pathway Report`,
          text: `Pathway Report for ${name}`,
          url: window.location.href,
        });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await copyLink();
  };

  const r = displayReport;

  // Executive Summary inputs (derived, no new data required)
  const topStrengths = (r.strengths_snapshot ?? []).slice(0, 3);
  const bestFitPathway =
    r.recommended_pathways?.find((p) => p.type === "best-fit") ??
    r.recommended_pathways?.[0];
  const topNextSteps = (() => {
    const fromPlan = r.family_action_plan?.this_week ?? [];
    if (fromPlan.length >= 3) return fromPlan.slice(0, 3);
    const fromBestFit = bestFitPathway?.action_steps?.thirty_day ?? [];
    return [...fromPlan, ...fromBestFit].slice(0, 3);
  })();
  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const confidenceLabel =
    r.confidence_level === "high"
      ? "High confidence"
      : r.confidence_level === "moderate"
        ? "Moderate confidence"
        : r.confidence_level
          ? "Lower confidence"
          : null;

  return (
    <div className="report-shell">
    <section
      className={cn(
        "report-root mx-auto px-4 py-10 sm:px-6 lg:px-8",
        density === "compact" ? "report-compact max-w-[92rem]" : "max-w-6xl",
      )}
    >
      {/* Scoped compact-density overrides — only apply when `.report-compact` is on the root */}
      <style>{`
        @media (min-width: 640px) {
          .report-compact { font-size: 0.875rem; }
          .report-compact .font-display { letter-spacing: -0.01em; }
          .report-compact h1 { font-size: 1.6rem; line-height: 2rem; }
          .report-compact h2 { font-size: 1.25rem; line-height: 1.65rem; }
          .report-compact h3 { font-size: 1.05rem; line-height: 1.45rem; }
          .report-compact h4 { font-size: 0.925rem; line-height: 1.35rem; }
          .report-compact .p-3 { padding: 0.625rem; }
          .report-compact .p-4 { padding: 0.75rem; }
          .report-compact .p-5 { padding: 0.625rem; }
          .report-compact .p-6 { padding: 0.875rem; }
          .report-compact .p-8 { padding: 1rem; }
          .report-compact .px-6 { padding-left: 1rem; padding-right: 1rem; }
          .report-compact .py-6 { padding-top: 1rem; padding-bottom: 1rem; }
          .report-compact .px-8 { padding-left: 1.25rem; padding-right: 1.25rem; }
          .report-compact .sm\\:p-8 { padding: 1rem; }
          .report-compact .sm\\:p-10 { padding: 1.25rem; }
          .report-compact .py-10 { padding-top: 1.25rem; padding-bottom: 1.25rem; }
          .report-compact .sm\\:py-12 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
          .report-compact .mt-3 { margin-top: 0.5rem; }
          .report-compact .mt-4 { margin-top: 0.625rem; }
          .report-compact .mt-5 { margin-top: 0.75rem; }
          .report-compact .mt-6 { margin-top: 0.875rem; }
          .report-compact .mt-8 { margin-top: 1rem; }
          .report-compact .mt-10 { margin-top: 1.25rem; }
          .report-compact .mb-4 { margin-bottom: 0.625rem; }
          .report-compact .gap-2 { gap: 0.375rem; }
          .report-compact .gap-3 { gap: 0.5rem; }
          .report-compact .gap-4 { gap: 0.625rem; }
          .report-compact .gap-6 { gap: 0.875rem; }
          .report-compact .gap-x-8 { column-gap: 1rem; }
          .report-compact .gap-y-5 { row-gap: 0.875rem; }
          .report-compact .space-y-1\\.5 > * + * { margin-top: 0.375rem; }
          .report-compact .space-y-2 > * + * { margin-top: 0.375rem; }
          .report-compact .space-y-3 > * + * { margin-top: 0.5rem; }
          .report-compact .rounded-3xl { border-radius: 1rem; }
          .report-compact .rounded-2xl { border-radius: 0.875rem; }
          .report-compact .rounded-xl { border-radius: 0.625rem; }
        }
      `}</style>

      {/* Report TOC removed — the top PathwayReportStageProgress rail is the single legend. */}

      {/* ============ PRINT-ONLY COVER PAGE ============ */}
      <div className="print-cover hidden print:block" aria-hidden>
        <div className="print-cover-frame">
          <header className="print-cover-brand">
            <span className="print-cover-mark" aria-hidden />
            <span className="print-cover-brand-text">TransitionForward</span>
          </header>

          <div className="print-cover-body">
            <p className="print-cover-eyebrow">
              {audience === "family" ? "Pathway Report" : "Educator PPT Prep Packet"}
            </p>
            <h1 className="print-cover-title">{toTitleCase(name)}</h1>
            <p className="print-cover-sub">
              {audience === "family"
                ? "A personalized plan for the road ahead — built with you, reviewed by an educator."
                : "A teacher-facing packet to ground the next Planning & Placement Team meeting."}
            </p>
            <div className="print-cover-rule" />
            <dl className="print-cover-meta-grid">
              <div>
                <dt>Prepared For</dt>
                <dd>{meta?.preparedFor ?? name}</dd>
              </div>
              <div>
                <dt>Prepared By</dt>
                <dd>{meta?.preparedBy ?? "TransitionForward (AI-supported, human-led)"}</dd>
              </div>
              <div>
                <dt>Date Issued</dt>
                <dd>{meta?.issued ?? today}</dd>
              </div>
              <div>
                <dt>Document</dt>
                <dd>{meta?.reportId ?? "—"} · v{meta?.version ?? "1.0"}</dd>
              </div>
            </dl>
          </div>

          <footer className="print-cover-footer">
            <span>
              {meta?.confidentiality ??
                "Confidential — for the student, family, and authorized educators."}
            </span>
            {confidenceLabel && <span className="print-cover-footer-tag">{confidenceLabel}</span>}
          </footer>
        </div>
      </div>

      {/* ============ FLIPBOOK COVER ============ */}
      <header ref={headerRef} className="fb-cover no-print">
        <div className="fb-cover-spine">
          TransitionForward · Pathway Report · Doc {meta?.reportId ?? "—"}
        </div>

        <div className="fb-sticker" aria-hidden>
          <span>Pathway</span>
          <span className="big">v{meta?.version ?? "1.0"}</span>
          <span>{audience === "family" ? "Family" : audience === "student" ? "Student" : "Educator"}</span>
        </div>

        <div className="fb-mast">
          <span>TransitionForward · Pathway Edition</span>
          <strong>{meta?.issued ?? today}</strong>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.55fr_1fr] lg:items-end">
          <div>
            <p className="fb-issue" aria-hidden>
              {(meta?.reportId ?? "01").toString().slice(-2)}
            </p>
            <p className="font-display mt-4 text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--demo-accent)]">
              {audience === "family"
                ? "A Personalized Transition Plan"
                : audience === "student"
                  ? "Your Plan, In Your Words"
                  : "Planning & Placement Team Packet"}
            </p>
            <h1 className="fb-headline">{toTitleCase(heading)}</h1>
            <p className="fb-dek">{subheading}</p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <div className="tf-audience" role="tablist" aria-label="Choose a report view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={audience === "student"}
                  onClick={() => setAudience("student", { syncUrl: true })}
                  className={audience === "student" ? "is-active" : ""}
                >
                  Student
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={audience === "family"}
                  onClick={() => setAudience("family", { syncUrl: true })}
                  className={audience === "family" ? "is-active" : ""}
                >
                  Family
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={audience === "educator"}
                  onClick={() => setAudience("educator", { syncUrl: true })}
                  className={audience === "educator" ? "is-active" : ""}
                >
                  Educator
                </button>
              </div>
              {confidenceLabel && (
                <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 ring-1 ring-white/20">
                  <ShieldCheck className="h-3.5 w-3.5" /> {confidenceLabel}
                </span>
              )}
              <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/75 ring-1 ring-white/20">
                <Sparkles className="h-3.5 w-3.5" /> AI-Drafted · Educator-Reviewable
              </span>
            </div>
          </div>

          {/* At-a-glance */}
          <aside>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.3em] text-[color:var(--demo-accent)]">
              At A Glance
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 text-white">
              <MetaField label="Prepared For" value={meta?.preparedFor ?? name} />
              <MetaField label="Prepared By" value={(meta?.preparedBy ?? "TransitionForward").split("(")[0].trim()} />
              <MetaField label="Date Issued" value={meta?.issued ?? today} />
              <MetaField
                label="Audience"
                value={audience === "family" ? "Family-Friendly Language" : audience === "student" ? "Student View" : "PPT-Ready Format"}
              />
            </dl>
            <p className="mt-5 border-t border-white/15 pt-4 text-[11px] leading-snug text-white/65">
              {meta?.confidentiality ?? "Confidential — for the student, family, and authorized educators."}
            </p>
          </aside>
        </div>

        <dl className="fb-meta">
          <div>
            <dt>Reading View</dt>
            <dd>{audience === "family" ? "Family Edition" : audience === "student" ? "Student Edition" : "Educator Edition"}</dd>
          </div>
          <div>
            <dt>Sections</dt>
            <dd>Snapshot · Voice · Pathways · Plan</dd>
          </div>
          <div>
            <dt>Last Updated</dt>
            <dd>{meta?.lastUpdated ?? meta?.issued ?? today}</dd>
          </div>
        </dl>
      </header>

      {/* ============ Slim editorial toolbar ============ */}
      <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-[color:var(--demo-primary)]/12 py-3">
        <div
          role="group"
          aria-label="Report density"
          className="inline-flex rounded-full bg-muted/60 p-0.5"
        >
          <button
            type="button"
            onClick={() => setDensity("compact")}
            aria-pressed={density === "compact"}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              density === "compact"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Compact
          </button>
          <button
            type="button"
            onClick={() => setDensity("comfortable")}
            aria-pressed={density === "comfortable"}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              density === "comfortable"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Comfortable
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (typeof window !== "undefined")
                window.dispatchEvent(
                  new CustomEvent("report-blocks-toggle", { detail: { open: true } }),
                );
            }}
            aria-label="Expand all sections"
          >
            <ChevronsUpDown className="h-4 w-4" /> Expand
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (typeof window !== "undefined")
                window.dispatchEvent(
                  new CustomEvent("report-blocks-toggle", { detail: { open: false } }),
                );
            }}
            aria-label="Collapse all sections"
          >
            <ChevronsDownUp className="h-4 w-4" /> Collapse
          </Button>
          {onSaveToProfile && (
            <Button
              variant={saved ? "outline" : "ghost"}
              size="sm"
              onClick={onSaveToProfile}
              disabled={saved}
              aria-label="Save to Student Profile"
            >
              {saved ? <Check className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
              {saved ? "Saved" : saveLabel ?? "Save"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={shareReport} aria-label="Share Pathway Report">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Share"}
          </Button>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh Pathway Report"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={downloadMagazinePdf}
            aria-label="Download Pathway Report as PDF in magazine-handbook reader view"
            className="bg-demo-primary"
            title="Renders the magazine-handbook reader view: chapter openers, pull quotes, and editorial layout."
          >
            <Download className="h-4 w-4" /> Download as PDF
          </Button>
        </div>
      </div>


      {/* ============ Student Snapshot summary card (top, all audiences) ============ */}
      <StudentSnapshotCard
        name={name}
        snapshot={r.student_snapshot}
        readiness={r.student_snapshot?.readiness_level ?? null}
        confidenceLabel={confidenceLabel}
        meta={meta}
        today={today}
      />

      {/* ============ Where Things Stand — decision-supportive opener ============ */}
      <section className="mt-8 page-break">
        <ValueCallout
          data={{
            whatThisMeans: `This report brings together everything we know about ${name} — intake answers, uploaded documents, ${name}'s own words, and family priorities — into one decision-supportive view.`,
            whyItMatters:
              "Transition planning fails most often because information is scattered across people and documents. This page is the shared starting point.",
            recommendedNextStep: `Read the Executive Summary, then jump to "Bring To The Team" before the next meeting.`,
            questionsForTeam: [
              "Does this match what you're seeing day-to-day?",
              "What's missing that we should add before the next meeting?",
            ],
            informationUsed: ["Intake", "Uploaded documents", "Student Voice", "Goals", "Readiness scores"],
            owner: "team",
            timeframe: "before the next PPT",
          }}
        />
      </section>

      <div className="mt-6 border-l-2 border-amber-400/50 pl-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
          Source Note · AI-Assisted Draft
        </p>
        <div className="mt-1 ai-disclaimer-bare">
          <AIDisclaimer variant="inline" className="!border-0 !bg-transparent !p-0 !shadow-none" />
        </div>
      </div>


      {/* ============ Inline numbered Table of Contents ============ */}
      <DocumentContents report={r} name={name} hasLinkedStudent={!!studentId} extraItems={demoStudentId ? getPhase4TocItems() : undefined} />


      {/* ============ Executive Summary ============ */}
      <section className="mt-10 page-break exec-summary">
        <PublicationPage
          kicker="Executive Summary"
          chapter="Executive Summary"
          dek="The big picture — what we know, where things are headed, and where to start."
          folio="p. 01"
        >
          <PublicationSpread
            lead={
              <div>
                <p className="text-sm leading-relaxed text-foreground/85">{r.summary}</p>
                {topStrengths.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Top Strengths</p>
                    <PublicationChecklist items={topStrengths} />
                  </div>
                )}
                {bestFitPathway && (
                  <div className="mt-6 border-t border-[color:var(--pub-rule-soft)] pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Best-Fit Direction</p>
                    <p className="font-display text-lg leading-snug">{toTitleCase(bestFitPathway.title)}</p>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-4">{bestFitPathway.why_it_fits}</p>
                  </div>
                )}
              </div>
            }
            side={
              <PublicationSidebar label="Start Here This Week">
                {topNextSteps.length > 0 ? (
                  <PublicationChecklist items={topNextSteps} />
                ) : (
                  <p className="text-sm text-muted-foreground">See the 30-Day Plan below.</p>
                )}
              </PublicationSidebar>
            }
          />
        </PublicationPage>
      </section>


      {/* ============ Nine-Stage Journey — grouped report body ============ */}
      <PathwayReportBody
        sections={{
          student_snapshot: (
            <>
      {/* ============ Student Snapshot ============ */}
      {r.student_snapshot && (
        <Block id="sec-snapshot" title="Student Snapshot" icon={<Compass className="h-5 w-5" />}>
          <PublicationPage
            kicker="Section 01"
            chapter="Student Snapshot"
            dek={`A profile of ${name} — strengths, preferences, and transition status.`}
            folio="p. 02"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--pub-rule-soft)] py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{toTitleCase(name)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.student_snapshot.grade_level} · {r.student_snapshot.graduation_timeline}
                </p>
              </div>
              <ReadinessBadge level={r.student_snapshot.readiness_level} />
            </div>
            {[
              { label: "Primary Interests", items: r.student_snapshot.primary_interests },
              { label: "Learning Preferences", items: r.student_snapshot.learning_preferences },
              { label: "Family Priorities", items: r.student_snapshot.family_priorities },
            ].map(({ label, items }) => (
              <div key={label} className="border-b border-[color:var(--pub-rule-soft)] py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
                <BulletList items={items} />
              </div>
            ))}
            <div className="border-b border-[color:var(--pub-rule-soft)] py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Communication Style</p>
              <p className="mt-2 text-sm text-foreground/80">{r.student_snapshot.communication_style}</p>
            </div>
            <div className="border-b border-[color:var(--pub-rule-soft)] py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Where {name} Is Now</p>
              <p className="mt-2 text-sm text-foreground/80">{r.student_snapshot.current_transition_status}</p>
            </div>
            <PublicationPullQuote attribution={`In ${name}'s voice`}>
              "{r.student_snapshot.student_voice_quote}"
            </PublicationPullQuote>
          </PublicationPage>
        </Block>
      )}
            </>
          ),
          student_voice: (
            <>
      {/* ============ Phase 6D — Your Voice in this plan (Student tab) ============ */}
      {audience === "student" && voiceResponses.length > 0 && (
        <Block
          id="sec-your-voice"
          title="Your Voice in this Plan"
          icon={<Quote className="h-5 w-5" />}
        >
          <PublicationPage
            kicker="Student Edition"
            chapter="Your Voice in This Plan"
            dek="These are your own words from Student Voice — they help shape this plan."
            folio="p. 05"
          >
            {voiceResponses.slice(0, 3).map((vr) => {
              const prompt = STUDENT_VOICE_PROMPTS.find((p) => p.key === vr.prompt_key);
              return (
                <PublicationPullQuote key={vr.id} attribution={prompt?.question ?? vr.prompt_key}>
                  "{vr.response_text}"
                </PublicationPullQuote>
              );
            })}
          </PublicationPage>
        </Block>
      )}
      {/* ============ Student Voice Prompts ============ */}
      {r.student_voice_prompts && r.student_voice_prompts.length > 0 && (
        <Block id="sec-student-voice" title={`In ${name}'s Voice`} icon={<MessageSquareQuote className="h-5 w-5" />}>
          <PublicationPage
            kicker="Section 05"
            chapter={`In ${name}'s Voice`}
            dek={`Questions for ${name} to think through — alone, with family, or with a teacher.`}
            folio="p. 06"
          >
            {r.student_voice_prompts.map((p, i) => (
              <PublicationPullQuote key={i} attribution={p.suggested_reflection}>
                {p.prompt}
              </PublicationPullQuote>
            ))}
          </PublicationPage>
        </Block>
      )}
            </>
          ),
          strengths_preferences_interests_needs: (
            <>
      {/* ============ SPIN Analysis ============ */}
      {r.spin_analysis && (
        <Block id="sec-spin" title="Strengths, Preferences, Interests & Needs" icon={<Sparkles className="h-5 w-5" />}>
          <PublicationPage
            kicker="Section 02"
            chapter="Strengths, Preferences, Interests & Needs"
            dek="A multi-dimensional profile to ground every goal conversation."
            folio="p. 03"
          >
            {[
              { label: "Strengths", items: r.spin_analysis.strengths },
              { label: "Preferences", items: r.spin_analysis.preferences },
              { label: "Interests", items: r.spin_analysis.interests },
              { label: "Needs", items: r.spin_analysis.needs },
              { label: "Motivators", items: r.spin_analysis.motivators },
              { label: "Barriers", items: r.spin_analysis.barriers },
              { label: "Environmental Supports", items: r.spin_analysis.environmental_supports },
              { label: "Areas for Growth", items: r.spin_analysis.areas_for_growth },
            ].map(({ label, items }) => (
              <div key={label} className="border-b border-[color:var(--pub-rule-soft)] py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
                <BulletList items={items} />
              </div>
            ))}
            <PublicationCallout kind="means">
              <p>{r.spin_analysis.what_this_means}</p>
            </PublicationCallout>
          </PublicationPage>
        </Block>
      )}
      {/* ============ Strengths to Lead With (always) ============ */}
      <Block id="sec-strengths" title="Strengths to Lead With" icon={<HeartHandshake className="h-5 w-5" />}>
        <BulletList items={r.strengths_snapshot} />
      </Block>
            </>
          ),
          family_action_plan: (
            <>
      {/* ============ Family Action Plan ============ */}
      {!hasV2 && r.family_action_plan && (
        <Block id="sec-family-plan" title="Family Action Plan" icon={<HeartHandshake className="h-5 w-5" />}>
          <PublicationPage
            kicker="Section 06"
            chapter="Family Action Plan"
            dek="A time-phased checklist for the family — from this week to graduation."
            folio="p. 07"
          >
            <PublicationSpread
              lead={
                <div>
                  <PublicationChecklist title="This Week" items={r.family_action_plan.this_week} />
                  <div className="mt-4">
                    <PublicationChecklist title="This Month" items={r.family_action_plan.this_month} />
                  </div>
                  <div className="mt-4">
                    <PublicationChecklist title="Before the Next Meeting" items={r.family_action_plan.before_next_meeting} />
                  </div>
                </div>
              }
              side={
                <PublicationSidebar label="Looking Further Ahead">
                  <PublicationChecklist title="This School Year" items={r.family_action_plan.this_school_year} />
                  <div className="mt-4">
                    <PublicationChecklist title="Before Graduation" items={r.family_action_plan.before_graduation} />
                  </div>
                </PublicationSidebar>
              }
            />
          </PublicationPage>
        </Block>
      )}
            </>
          ),
          meeting_prep_questions: (
            <>
      {/* ============ Meeting prep toolkit ============ */}
      {!hasV2 && r.meeting_prep_toolkit && (
        <Block id="sec-meeting-prep" title="Next PPT / IEP Meeting Prep" icon={<ListChecks className="h-5 w-5" />}>
          <PublicationPage
            kicker="Section 07"
            chapter="Next PPT / IEP Meeting Prep"
            dek="Print this page and bring it to the next PPT. One list — every open question and next step."
            folio="p. 08"
          >
            <PublicationSpread
              lead={
                <div>
                  {[
                    { label: "Questions to Ask", items: r.meeting_prep_toolkit.questions_to_ask },
                    { label: "Concerns to Raise", items: r.meeting_prep_toolkit.concerns_to_raise },
                    { label: "Goals to Review", items: r.meeting_prep_toolkit.goals_to_review },
                    { label: "Student Voice Prompts", items: r.meeting_prep_toolkit.student_voice_prompts },
                  ].map(({ label, items }) => (
                    <div key={label} className="border-b border-[color:var(--pub-rule-soft)] py-3">
                      <PublicationChecklist title={label} items={items} />
                    </div>
                  ))}
                </div>
              }
              side={
                <PublicationSidebar label="Bring & Know">
                  <PublicationChecklist title="Documents to Bring" items={r.meeting_prep_toolkit.documents_to_bring} />
                  <div className="mt-4">
                    <PublicationChecklist title="Strengths to Highlight" items={r.meeting_prep_toolkit.strengths_to_highlight} />
                  </div>
                  <div className="mt-4">
                    <PublicationChecklist title="Services to Discuss" items={r.meeting_prep_toolkit.services_to_discuss} />
                  </div>
                  <div className="mt-4">
                    <PublicationChecklist title="Follow-up Items" items={r.meeting_prep_toolkit.follow_up_items} />
                  </div>
                </PublicationSidebar>
              }
            />
            <PublicationCallout kind="source">
              <p>Tip: print this section as a one-page checklist to bring to the meeting.</p>
            </PublicationCallout>
          </PublicationPage>
        </Block>
      )}
      {/* ============ Questions to bring (only when no toolkit) ============ */}
      {!r.meeting_prep_toolkit && (
        <Block title="Questions to Bring to the Next PPT" icon={<ListChecks className="h-5 w-5" />}>
          <BulletList items={r.family_questions_for_ppt} />
        </Block>
      )}
            </>
          ),
          educator_action_plan: (
            <>
      {/* ============ Teacher / case manager plan ============ */}
      {!hasV2 && r.teacher_action_plan && (
        <Block
          title="Educator / Case Manager Action Plan"
          icon={<GraduationCap className="h-5 w-5" />}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MiniCard label="Goal Updates" items={r.teacher_action_plan.goal_updates} />
            <MiniCard
              label="Progress Monitoring"
              items={r.teacher_action_plan.progress_monitoring}
            />
            <MiniCard
              label="Assessments to Run"
              items={r.teacher_action_plan.assessments_to_run}
            />
            <MiniCard
              label="Classroom Activities"
              items={r.teacher_action_plan.classroom_activities}
            />
            <MiniCard
              label="Family Communication"
              items={r.teacher_action_plan.family_communication}
            />
            <MiniCard
              label="Student Conference Qs"
              items={r.teacher_action_plan.student_conference_questions}
            />
            <MiniCard
              label="Service Connections"
              items={r.teacher_action_plan.service_connections}
            />
            <MiniCard label="Accommodations" items={r.teacher_action_plan.accommodations} />
            <MiniCard
              label="Work-Based Learning"
              items={r.teacher_action_plan.work_based_learning}
            />
          </div>
        </Block>
      )}

      {/* ============ Teacher next steps (only when no teacher_action_plan) ============ */}
      {audience === "educator" && !r.teacher_action_plan && (
        <Block title="Teacher Next Steps" icon={<GraduationCap className="h-5 w-5" />}>
          <BulletList items={r.teacher_next_steps} />
        </Block>
      )}
            </>
          ),
          iep_transition_translator: (
            <>
      {/* ============ IEP translator ============ */}
      {!hasV2 && r.iep_translator && r.iep_translator.length > 0 && (
        <Block id="sec-iep-translator" title="IEP / Transition Plan Translator" icon={<BookOpen className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-muted-foreground">
            Plain-English translations of transition-related goal language. This is not legal
            advice and does not replace the school team — it helps families and students arrive
            informed.
          </p>
          <div className="space-y-3">
            {r.iep_translator.map((t, i) => (
              <div key={i} className="border-l-2 border-primary/30 pl-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Goal Language
                </p>
                <p className="mt-1 italic text-foreground/80">"{t.goal_text}"</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 grid-sym-2">
                  <Labeled label="What It Means">{t.plain_meaning}</Labeled>
                  <Labeled label="Connected to Real Life">{t.connected_to_real_life}</Labeled>
                  <Labeled label={`What ${name} should know`}>{t.what_student_should_know}</Labeled>
                  <MiniCard label="Connected Services" items={t.connected_services} compact />
                  <MiniCard label="Questions to Ask" items={t.questions_to_ask} compact />
                  {t.missing_information.length > 0 && (
                    <MiniCard label="Missing Info" items={t.missing_information} compact />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}
            </>
          ),
          data_gaps: (
            <>
      {/* ============ Data gaps ============ */}
      {r.data_gaps && r.data_gaps.length > 0 && (
        <Block id="sec-data-gaps" title="What We Still Need to Know" icon={<AlertTriangle className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-muted-foreground">
            This report doesn't pretend to know everything. Here's what would sharpen it.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 grid-sym-2">
            {r.data_gaps.map((g, i) => (
              <div
                key={i}
                className="rounded-2xl border border-amber-400/40 bg-amber-50/40 p-5 dark:bg-amber-950/10"
              >
                <h3 className="font-display text-lg">{toTitleCase(g.item)}</h3>
                <Labeled label="Why It Matters">{g.why_it_matters}</Labeled>
                <Labeled label="Who Can Help">{g.who_can_help}</Labeled>
                <Labeled label="How to Collect">{g.how_to_collect}</Labeled>
                <Labeled label="A Question to Ask">
                  <span className="italic">{g.question_to_ask}</span>
                </Labeled>
              </div>
            ))}
          </div>
        </Block>
      )}
            </>
          ),
          readiness_scorecard: (
            <>
      {/* ============ Readiness scorecard ============ */}
      {r.readiness_scorecard && r.readiness_scorecard.length > 0 && (
        <Block id="sec-readiness" title="Transition Readiness Scorecard" icon={<Target className="h-5 w-5" />}>
          <PublicationPage
            kicker="Section 03"
            chapter="Transition Readiness Scorecard"
            dek="A strengths-based snapshot. These are conversation starters, not grades."
            folio="p. 04"
          >
            {r.readiness_scorecard.map((row) => (
              <div key={row.category} className="border-b border-[color:var(--pub-rule-soft)] py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">{toTitleCase(row.category)}</p>
                  <ReadinessBadge level={row.level} compact />
                </div>
                <Progress
                  value={READINESS_PCT[row.level] ?? 50}
                  className="mt-2 h-1.5"
                  aria-label={`${toTitleCase(row.category)} readiness: ${row.level}`}
                />
                <p className="mt-2 text-sm text-foreground/80">{row.evidence}</p>
                <PublicationCallout kind="means">
                  <p>{row.what_it_means}</p>
                </PublicationCallout>
                <PublicationCallout kind="next">
                  <p><strong>Growth step:</strong> {row.growth_activity}</p>
                  <p className="mt-1"><strong>Possible goal:</strong> {row.suggested_goal}</p>
                </PublicationCallout>
              </div>
            ))}
          </PublicationPage>
        </Block>
      )}
            </>
          ),
          postsecondary_goals: (
            <>
      {/* ============ Postsecondary Goal Breakdown ============ */}
      {r.postsecondary_goals && r.postsecondary_goals.length > 0 && (
        <Block id="sec-goals" title="Postsecondary Goal Breakdown" icon={<Target className="h-5 w-5" />}>
          <Accordion type="multiple" className="border-y border-[color:var(--pub-rule-soft,theme(colors.border))]">
            {r.postsecondary_goals.map((g, i) => (
              <AccordionItem key={i} value={`goal-${i}`} className="px-5">
                <AccordionTrigger className="text-left">
                  <span className="font-display text-lg">{toTitleCase(g.area)}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3 pb-2 sm:grid-cols-2">
                    <Labeled label="Current Status">{g.current_status}</Labeled>
                    <Labeled label="Suggested Direction">{g.suggested_direction}</Labeled>
                    <Labeled label="Why It Matters">{g.why_it_matters}</Labeled>
                    <Labeled label="Draft Measurable Goal">
                      <span className="italic">{g.measurable_goal_language}</span>
                    </Labeled>
                    <MiniCard label="Next Steps" items={g.next_steps} compact />
                    <MiniCard label="Who Supports" items={g.who_supports} compact />
                    <MiniCard label="Evidence Needed" items={g.evidence_needed} compact />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Block>
      )}
            </>
          ),
          recommended_pathways: (
            <>
      {/* ============ Recommended Pathways ============ */}
      {r.recommended_pathways && r.recommended_pathways.length > 0 && (
        <Block id="sec-pathways" title="Recommended Pathways" icon={<RouteIcon className="h-5 w-5" />}>
          <PublicationPage
            kicker="Section 04"
            chapter="Recommended Pathways"
            dek="Multiple realistic directions — not just one. Each has supports, steps, and a timeline."
            folio="p. 05"
          >
            {r.recommended_pathways.map((p) => (
              <div key={p.title} className="border-b border-[color:var(--pub-rule-soft)] py-6">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge
                    variant={p.type === "best-fit" ? "default" : "secondary"}
                    className="uppercase tracking-wider"
                  >
                    {PATHWAY_TYPE_LABEL[p.type] ?? p.type}
                  </Badge>
                  <p className="font-display text-xl">{toTitleCase(p.title)}</p>
                  {confidenceLabel && (
                    <Badge variant="outline" className="gap-1 text-[11px]">
                      <ShieldCheck className="h-3 w-3" /> {confidenceLabel}
                    </Badge>
                  )}
                  {r.student_snapshot?.readiness_level && (
                    <Badge variant="outline" className="gap-1 text-[11px]">
                      <Target className="h-3 w-3" /> Readiness:{" "}
                      {READINESS_LABEL[r.student_snapshot.readiness_level] ??
                        r.student_snapshot.readiness_level}
                    </Badge>
                  )}
                </div>
                <p className="mb-4 text-sm text-foreground/80">{p.why_it_fits}</p>
                <PublicationSpread
                  lead={
                    <div>
                      {[
                        { label: "Builds on These Strengths", items: p.related_strengths },
                        { label: "Possible Barriers", items: p.possible_barriers },
                        { label: "Supports Needed", items: p.supports_needed },
                        { label: "At School", items: p.school_experiences },
                        { label: "In the Community", items: p.community_experiences },
                        { label: "Courses & Programs", items: p.courses_or_programs },
                        { label: "Career Clusters", items: p.career_clusters },
                        { label: "Credentials", items: p.credentials },
                        { label: "Partner Resources", items: p.partner_resources },
                      ].map(({ label, items }) => items?.length > 0 && (
                        <div key={label} className="border-b border-[color:var(--pub-rule-soft)] py-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
                          <BulletList items={items} compact />
                        </div>
                      ))}
                    </div>
                  }
                  side={
                    <PublicationSidebar label="Action Steps">
                      {[
                        { label: "30 days", items: p.action_steps.thirty_day },
                        { label: "90 days", items: p.action_steps.ninety_day },
                        { label: "6 months", items: p.action_steps.six_month },
                        { label: "1 year", items: p.action_steps.one_year },
                      ].map(({ label, items }) => items.length > 0 && (
                        <div key={label} className="mb-3">
                          <PublicationChecklist title={label} items={items} />
                        </div>
                      ))}
                    </PublicationSidebar>
                  }
                />
              </div>
            ))}
          </PublicationPage>
        </Block>
      )}
      {/* ============ Classic career pathways (only when no modern equivalent) ============ */}
      {(!r.recommended_pathways || r.recommended_pathways.length === 0) &&
        (!r.career_matches || r.career_matches.length === 0) && (
        <Block title="Career Pathways to Explore" icon={<Compass className="h-5 w-5" />}>
          <div className="grid gap-4">
            {r.career_pathways.map((p) => (
              <div key={p.title} className="border-b border-[color:var(--pub-rule-soft,theme(colors.border))] py-5 last:border-b-0">
                <h3 className="font-display text-xl font-medium">{toTitleCase(p.title)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.why_it_fits}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 grid-sym-2">
                  <MiniCard label="Example Roles" items={p.example_roles} compact />
                  <MiniCard label="First Steps" items={p.first_steps} compact />
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}
      <Block id="sec-education" title="Education & Training Options" icon={<BookOpen className="h-5 w-5" />}>
        <BulletList items={r.education_training_options} />
      </Block>
            </>
          ),
          career_life_matches: (
            <>
      {/* ============ Career Matches ============ */}
      {r.career_matches && r.career_matches.length > 0 && (
        <Block id="sec-careers" title="Career & Life Pathway Matches" icon={<Briefcase className="h-5 w-5" />}>
          <div className="divide-y divide-[color:var(--pub-rule-soft,theme(colors.border))]">
            {r.career_matches.map((c) => (
              <div key={c.cluster} className="py-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-xl">{toTitleCase(c.cluster)}</h3>
                  <ReadinessBadge level={c.readiness_level} compact />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 grid-sym-2">
                  <MiniCard label="Example Jobs" items={c.example_jobs} compact />
                  <MiniCard label="Skills Used" items={c.skills_required} compact />
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <p>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Education / Training
                    </span>
                    <br />
                    <span className="text-foreground/80">{c.education_needed}</span>
                  </p>
                  <p>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Work Environment
                    </span>
                    <br />
                    <span className="text-foreground/80">{c.work_environment}</span>
                  </p>
                </div>
                <MiniCard label="Possible Accommodations" items={c.accommodations} compact />
                <p className="mt-3 border-l-2 border-primary/30 pl-3 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Next Exploration Step
                  </span>
                  <br />
                  {c.next_step}
                </p>
              </div>
            ))}
          </div>
        </Block>
      )}
            </>
          ),
          next_steps_30_90_180_365: (
            <>
      <Block id="sec-life-skills" title="Life Skills to Focus On" icon={<Lightbulb className="h-5 w-5" />}>
        <BulletList items={r.life_skills_focus} />
      </Block>
      {/* ============ 30 / 60 / 90 Day Plan (always) ============ */}
      <PlanBlock report={r} extendedPlans={extendedPlans} />
      {/* ============ Phase 4 — Self-Advocacy + Independent Living + Role Next Steps + Sources ============ */}
      {demoStudentId && (
        <ReportPhase4Sections
          studentId={demoStudentId}
          audience={audience}
          reportId={meta?.reportId}
          preparedBy={meta?.preparedBy}
          issued={meta?.issued}
        />
      )}
            </>
          ),
          recommended_resources: (
            <>
      {/* ============ Opportunity matches ============ */}
      {!hasV2 && r.opportunity_matches && r.opportunity_matches.length > 0 && (
        <Block id="sec-opportunities" title="Opportunities to Explore" icon={<MapIcon className="h-5 w-5" />}>
          {studentId && (
            <div className="mb-5">
              <OpportunityPipelineSummary studentId={studentId} studentDisplayName={name} />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 grid-sym-2">
            {r.opportunity_matches.map((o, i) => (
              <div key={i} className="border-b border-[color:var(--pub-rule-soft,theme(colors.border))] py-5 last:border-b-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="mb-2 uppercase tracking-wider">
                      {toTitleCase(o.category)}
                    </Badge>
                    <h3 className="font-display text-lg">{toTitleCase(o.name)}</h3>
                  </div>
                  <ReadinessBadge level={o.readiness_level} compact />
                </div>
                <Labeled label="Why it may fit">{o.why_it_fits}</Labeled>
                <Labeled label={`What ${name} could gain`}>{o.what_student_gains}</Labeled>
                <Labeled label="How to explore it">{o.how_to_explore}</Labeled>
                <Labeled label="Who should help">{o.who_helps}</Labeled>
              </div>
            ))}
          </div>
        </Block>
      )}
            </>
          ),
          partner_matches: (
            <>
      {/* ============ Partner suggestions (live, student-linked) ============ */}
      <Block
        id="sec-partner-suggestions"
        title="Partner Suggestions"
        icon={<HeartHandshake className="h-5 w-5" />}
      >
        <p className="mb-4 text-sm text-muted-foreground">
          Organizations from the TransitionForward network matched to {name}'s pathway goals,
          interests, county, and support needs.
        </p>
        <ReportPartnerSuggestions studentId={studentId} />
      </Block>
            </>
          ),
        }}
        appendix={(
          <>
      {/* ============ Progress timeline ============ */}
      {r.progress_timeline && r.progress_timeline.length > 0 && (
        <Block id="sec-timeline" title="Progress Timeline" icon={<Calendar className="h-5 w-5" />}>
          <ol className="relative space-y-4 border-l-2 border-border/60 pl-6">
            {r.progress_timeline.map((s, i) => (
              <li key={i} className="relative">
                <span
                  className={cn(
                    "absolute -left-[31px] mt-1.5 h-4 w-4 rounded-full border-2",
                    s.status === "complete"
                      ? "border-primary bg-primary"
                      : s.status === "in-progress"
                        ? "border-primary bg-background"
                        : "border-border bg-background",
                  )}
                />
                <div className="border-l-2 border-primary/30 pl-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-lg">{toTitleCase(s.stage)}</h3>
                    <Badge
                      variant={s.status === "complete" ? "default" : "outline"}
                      className="uppercase tracking-wider"
                    >
                      {TIMELINE_STATUS_LABEL[s.status] ?? s.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                  <BulletList items={s.milestones} compact />
                  {s.suggested_deadline && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Suggested by: <span className="font-medium">{s.suggested_deadline}</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Block>
      )}
      {/* ============ Needs human review ============ */}
      {r.needs_human_review && r.needs_human_review.length > 0 && (
        <Block id="sec-review" title="Worth a Human Second Look" icon={<ShieldCheck className="h-5 w-5" />}>
          <div className="border-l-2 border-amber-400/60 pl-5 py-3">
            <p className="text-sm text-muted-foreground">
              These items are the AI's best guess based on the intake. Please review with the
              student, family, or school team before acting on them.
            </p>
            <BulletList items={r.needs_human_review} />
          </div>
        </Block>
      )}
          </>
        )}
      />


      {/* ============ Connect to plan: push items into Actions/Calendar ============ */}
      {!demo && (
        <ConnectToPlan
          report={displayReport}
          studentId={studentId}
          reportId={meta?.reportId}
        />
      )}

      {/* ============ Bring To The Team — consolidated decision checklist ============ */}
      <section className="report-section mt-10 page-break">
        <div className="mb-3 flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl tracking-tight">Bring To The Team</h2>
        </div>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Print this page and bring it to the next PPT. It pulls together every
          open question and recommended next step from this report so the whole
          team starts from the same list.
        </p>
        <ValueCallout
          data={{
            ...CHAPTER_VALUE_DEFAULTS.bring_to_team,
            questionsForTeam: [
              ...(r.family_questions_for_ppt ?? []),
              ...(r.meeting_prep_toolkit?.questions_to_ask ?? []),
            ].slice(0, 8),
            recommendedNextStep: `Confirm an owner and a date for each next step before you leave the meeting.`,
            informationUsed: [
              "This report's recommendations",
              "Open questions from each chapter",
              meta?.reportId ? `Doc ${meta.reportId}` : "",
            ].filter(Boolean) as string[],
          }}
        />
      </section>

      {/* ============ Closing note (formal) ============ */}
      <section className="report-section mt-10">
        <div className="border-y border-primary/30 py-8 sm:py-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            A closing note for {name}
          </p>
          <p className="mt-3 font-display text-xl leading-relaxed text-foreground/85 sm:text-2xl">
            {r.encouragement_to_student}
          </p>
        </div>
      </section>

      {/* ============ Document footer / control ============ */}
      <footer className="mt-10 border-t-2 border-[color:var(--pub-rule-soft,theme(colors.border))]">
        <div className="border-b border-border/60 bg-amber-50/40 px-6 py-5 sm:px-8 dark:bg-amber-950/10">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Planning Disclaimer
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            This Pathway Report is a planning document — <strong>not a legal determination,
            clinical diagnosis, eligibility decision, or placement order</strong>. It is meant
            to organize a conversation between the student, family, and school team. Final
            decisions about services, accommodations, and placement are made by the IEP / PPT
            team based on the school's own evaluations and the student's IEP.
          </p>
        </div>
        <div className="grid gap-6 px-6 py-6 sm:grid-cols-3 sm:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Document
            </p>
            <p className="mt-2 text-sm text-foreground/85">
              TransitionForward Pathway Report
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              ID {meta?.reportId ?? "—"} · v{meta?.version ?? "1.0"} · {meta?.issued ?? today}
            </p>
            {meta?.nextReviewDate && (
              <p className="mt-1 text-xs text-muted-foreground">
                Next review: <span className="font-medium text-foreground/80">{meta.nextReviewDate}</span>
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              How This Was Prepared
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/75">
              AI-drafted from the student's intake and (when available) IEP excerpts, then
              formatted for family, student, and educator review. Recommendations are
              suggestions for the team to consider — they are not generated, reviewed, or
              endorsed by a licensed clinician or attorney.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Confidentiality
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/75">
              {meta?.confidentiality ?? "Share only with the student, family, and authorized members of the school team. Treat this document like any other planning record from the IEP file."}
            </p>
          </div>
        </div>
        <div className="border-t border-border/60 px-6 py-3 sm:px-8">
          <p className="text-[11px] text-muted-foreground">
            — End of report —
          </p>
        </div>
      </footer>


      {!demo && (
        <AiAssistPanel
          studentName={name}
          report={report}
          translatedTo={translatedTo}
          onTranslated={(next, lang) => {
            setDisplayReport(next);
            setTranslatedTo(lang);
          }}
          onReset={() => {
            setDisplayReport(report);
            setTranslatedTo(null);
          }}
        />
      )}

      <div className="no-print mt-10 flex flex-wrap gap-3">
        {onReset && (
          <Button onClick={onReset} variant="outline">
            {resetLabel}
          </Button>
        )}
        <Button onClick={downloadMagazinePdf} aria-label="Download Pathway Report as PDF in magazine-handbook reader view">
          <Download className="h-4 w-4" /> Download as PDF
        </Button>
      </div>

      <style>{`
        /* Auto-numbered sections — formal document feel */
        .report-root { counter-reset: section; }
        .report-section { counter-increment: section; }
        .report-section .section-number::before {
          content: "§ " counter(section, decimal-leading-zero);
        }

        /* Screen-only: hide the print cover */
        .print-cover { display: none; }

        /* Symmetric grids: when last item is odd, center it across full row */
        @media (min-width: 640px) {
          .grid-sym-2 > *:last-child:nth-child(odd) {
            grid-column: 1 / -1;
            max-width: calc(50% - 0.5rem);
            margin-inline: auto;
          }
        }
        @media (min-width: 1024px) {
          .grid-sym-3 > *:last-child:nth-child(3n - 1) {
            grid-column: span 2 / -1;
          }
          .grid-sym-3 > *:last-child:nth-child(3n - 2) {
            grid-column: 1 / -1;
            max-width: calc(33.333% - 0.667rem);
            margin-inline: auto;
          }
        }

        /* Gentle card lift on hover (screen only, respects reduced motion) */
        @media (hover: hover) and (prefers-reduced-motion: no-preference) {
          .report-root .lift-card {
            transition: transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease;
          }
          .report-root .lift-card:hover {
            transform: translateY(-2px);
            border-color: hsl(var(--border));
          }
        }




        @media print {
          /* Consistent margins + running header/footer on body pages */
          @page {
            size: Letter;
            margin: 0.7in 0.65in 0.85in 0.65in;
            @top-left {
              content: "TransitionForward";
              font: 600 8.5pt/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              color: #6b7280;
              letter-spacing: 0.12em;
              text-transform: uppercase;
            }
            @top-right {
              content: string(doc-section);
              font: 500 8.5pt/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              color: #6b7280;
            }
            @bottom-left {
              content: "${(name ?? "").replace(/["\\]/g, "\\$&")} · Pathway Report";
              font: 400 8.5pt/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              color: #9ca3af;
            }
            @bottom-right {
              content: counter(page) " / " counter(pages);
              font: 500 8.5pt/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              color: #6b7280;
            }
          }

          /* Cover page: full bleed, no running headers/footers */
          @page :first {
            margin: 0;
            @top-left { content: ""; }
            @top-right { content: ""; }
            @bottom-left { content: ""; }
            @bottom-right { content: ""; }
          }

          /* Section name shows in running header (set per-section below) */
          .report-section h2 { string-set: doc-section content(text); }

          html, body {
            background: #fff !important;
            color: #111 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .report-root { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }

          /* ---------- Cover page ---------- */
          .print-cover {
            display: block !important;
            page-break-after: always;
            break-after: page;
            page: cover;
          }
          .print-cover-frame {
            box-sizing: border-box;
            width: 100%;
            height: 100vh;
            min-height: 10in;
            padding: 0.9in 0.9in 0.8in 0.9in;
            display: flex;
            flex-direction: column;
            background:
              radial-gradient(ellipse at top right, rgba(37, 99, 235, 0.06), transparent 55%),
              linear-gradient(180deg, #ffffff 0%, #f7f8fb 100%);
            border-top: 6px solid #1e3a8a;
            position: relative;
          }
          .print-cover-brand {
            display: flex;
            align-items: center;
            gap: 10pt;
          }
          .print-cover-mark {
            display: inline-block;
            width: 14pt; height: 14pt;
            border-radius: 3pt;
            background: linear-gradient(135deg, #2563eb, #1e3a8a);
          }
          .print-cover-brand-text {
            font: 600 11pt/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            letter-spacing: 0.06em;
            color: #1e3a8a;
          }
          .print-cover-body {
            margin-top: auto;
            margin-bottom: auto;
            padding: 0.4in 0;
          }
          .print-cover-eyebrow {
            margin: 0 0 14pt 0;
            font: 600 10pt/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #2563eb;
          }
          .print-cover-title {
            margin: 0;
            font: 500 46pt/1.05 Georgia, "Iowan Old Style", "Times New Roman", serif;
            letter-spacing: -0.015em;
            color: #0b1220;
          }
          .print-cover-sub {
            margin: 18pt 0 0 0;
            max-width: 5.2in;
            font: 400 13pt/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #374151;
          }
          .print-cover-rule {
            margin-top: 28pt;
            height: 2pt;
            width: 60pt;
            background: #1e3a8a;
            border-radius: 1pt;
          }
          .print-cover-meta-grid {
            margin: 24pt 0 0 0;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16pt 32pt;
            max-width: 5.5in;
          }
          .print-cover-meta-grid dt {
            font: 600 8pt/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #6b7280;
            margin: 0 0 4pt 0;
          }
          .print-cover-meta-grid dd {
            margin: 0;
            font: 400 11pt/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #111827;
          }
          .print-cover-footer {
            margin-top: auto;
            padding-top: 18pt;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 12pt;
            font: 400 9pt/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #6b7280;
          }
          .print-cover-footer-tag {
            font-weight: 600;
            color: #1e3a8a;
            letter-spacing: 0.04em;
          }

          /* ---------- Body content ---------- */
          .report-root .shadow-soft,
          .report-root .shadow-lift,
          .report-root [class*="shadow-"] { box-shadow: none !important; }
          .report-root .rounded-3xl,
          .report-root .rounded-2xl,
          .report-root .rounded-xl { border-radius: 4px !important; }
          .report-root .bg-gradient-hero,
          .report-root [class*="bg-gradient-"] { background: #f8fafc !important; }
          .report-root .blur-3xl,
          .report-root .blur-2xl { display: none !important; }
          /* Hide decorative parallax / glow layers */
          .report-root [aria-hidden="true"].pointer-events-none { display: none !important; }

          .report-root { font: 10.5pt/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111 !important; }
          .report-root h1, .report-root h2, .report-root h3, .report-root h4 {
            color: #0b1220 !important;
            font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
            font-weight: 500;
          }
          .report-root h1 { font-size: 22pt; line-height: 1.15; }
          .report-root h2 { font-size: 16pt; line-height: 1.2; margin-top: 0; }
          .report-root h3 { font-size: 12.5pt; line-height: 1.3; }
          .report-root h4 { font-size: 11pt; }
          .report-root p { orphans: 3; widows: 3; }
          .report-root .text-muted-foreground,
          .report-root [class*="text-foreground/"] { color: #374151 !important; }
          .report-root a { color: #1e3a8a; text-decoration: none; }

          /* Section paging: each major section starts on a new page */
          .report-root .report-header,
          .report-root .exec-summary {
            page-break-after: always;
            break-after: page;
          }
          .report-root .report-section {
            page-break-before: always;
            break-before: page;
            margin-top: 0 !important;
          }
          /* Keep section heading with first paragraph; never split cards/lists/quotes */
          .report-root .report-section > div:first-child { break-after: avoid; page-break-after: avoid; }
          .report-root h2, .report-root h3, .report-root h4 { break-after: avoid; page-break-after: avoid; }
          .report-root figure,
          .report-root blockquote,
          .report-root li,
          .report-root tr { break-inside: avoid; page-break-inside: avoid; }
          .report-root .rounded-2xl,
          .report-root .rounded-3xl { break-inside: avoid; page-break-inside: avoid; }
          .report-root .page-break { break-inside: avoid; page-break-inside: avoid; }

          /* Borders read better in print */
          .report-root .border,
          .report-root [class*="border-"] { border-color: #d1d5db !important; }
          .report-root .bg-card,
          .report-root .bg-background,
          .report-root .bg-muted\\/30,
          .report-root .bg-muted\\/40 { background: #ffffff !important; }
          .report-root .bg-muted,
          .report-root .bg-muted\\/60 { background: #f3f4f6 !important; }
          .report-root .bg-primary\\/5,
          .report-root .bg-primary\\/10,
          .report-root .bg-primary\\/15 { background: #eff6ff !important; }

          /* Badges read as outline chips */
          .report-root [class*="badge"],
          .report-root .inline-flex.rounded-full {
            background: transparent !important;
            border: 1px solid #d1d5db !important;
            color: #111 !important;
          }
        }

        /* =========================================================================
         * Magazine-handbook PDF mode — activated by the "Download as PDF" button.
         * Body class print-magazine switches the print output from the plain
         * document layout above to the editorial reader view: warm paper
         * background, full-bleed teal chapter openers (ReportPartOpener), eh-page
         * sheets, peach handbook callouts, italic pull quotes and Urbanist /
         * Instrument Serif typography — i.e. what readers see on screen.
         * High specificity (body.print-magazine ...) + !important to win over
         * the classic-print overrides above.
         * ========================================================================= */
        @media print {
          /* Hide the classic typeset cover; the editorial cover (eh-cover / fb-cover) is the issue cover. */
          body.print-magazine .print-cover { display: none !important; }

          /* Issue-paper background carries through the printed pages. */
          body.print-magazine .report-shell {
            background: #F4F2EF !important;
          }
          body.print-magazine .report-root {
            padding: 0.4in !important;
            max-width: 100% !important;
          }

          /* Restore editorial typography (override the Georgia stack from above). */
          body.print-magazine .report-root,
          body.print-magazine .report-root p,
          body.print-magazine .report-root li,
          body.print-magazine .report-root span,
          body.print-magazine .report-root div {
            font-family: "Epilogue", "Urbanist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          }
          body.print-magazine .report-root h1,
          body.print-magazine .report-root h2,
          body.print-magazine .report-root h3,
          body.print-magazine .report-root h4 {
            font-family: "Urbanist", -apple-system, BlinkMacSystemFont, sans-serif !important;
            color: #0b1220 !important;
          }

          /* Editorial paper sheets — keep the rounded card feel, lose the screen shadow. */
          body.print-magazine .eh-page {
            background: #ffffff !important;
            border: 1px solid #e7e3dc !important;
            border-radius: 6px !important;
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Chapter openers (Part I–V) — each gets its own full-bleed teal page. */
          body.print-magazine .eh-chapter {
            background: #006666 !important;
            color: #ffffff !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            min-height: 8.5in !important;
            padding: 0.9in !important;
            page-break-before: always;
            break-before: page;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body.print-magazine .eh-chapter,
          body.print-magazine .eh-chapter * {
            color: #ffffff !important;
          }
          body.print-magazine .eh-chapter h1,
          body.print-magazine .eh-chapter h2 {
            font-family: "Instrument Serif", "Cormorant Garamond", Georgia, serif !important;
            font-style: italic !important;
            color: #ffffff !important;
          }
          body.print-magazine .eh-chapter .eh-chapter-num {
            color: rgba(255,255,255,0.18) !important;
            font-family: "Instrument Serif", Georgia, serif !important;
          }

          /* Editorial pull quote — keep the italic serif voice. */
          body.print-magazine .eh-pullquote {
            font-family: "Instrument Serif", "Cormorant Garamond", Georgia, serif !important;
            font-style: italic !important;
            font-size: 18pt !important;
            line-height: 1.3 !important;
            color: #0b1220 !important;
            border-left: 3px solid #006666 !important;
            padding-left: 0.5in !important;
            margin: 0.3in 0 !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Handbook callout — peach rule + warm fill. */
          body.print-magazine .eh-callout {
            background: #FFF6EE !important;
            border-left: 4px solid #FFCCAA !important;
            border-radius: 2px !important;
            padding: 12pt 14pt !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          body.print-magazine .eh-callout-label {
            color: #b45309 !important;
          }

          /* Handbook sidebar. */
          body.print-magazine .eh-sidebar {
            background: #fafaf7 !important;
            border: 1px solid #e7e3dc !important;
            border-radius: 4px !important;
            padding: 12pt 14pt !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Folio page-number badges. */
          body.print-magazine .eh-folio {
            color: #006666 !important;
          }

          /* Keep the issue's warm rules visible in print. */
          body.print-magazine .eh-cover-rule,
          body.print-magazine .eh-chapter-rule {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Restore color on accent backgrounds the classic block flattens. */
          body.print-magazine .report-root [class*="bg-gradient-"] {
            background: transparent !important;
          }
        }
      `}</style>
    </section>
    </div>
  );
}

/* ---------- Student Snapshot summary card (top of report) ---------- */

function StudentSnapshotCard({
  name,
  snapshot,
  readiness,
  confidenceLabel,
  meta,
  today,
}: {
  name: string;
  snapshot: PathwayReport["student_snapshot"];
  readiness: string | null;
  confidenceLabel: string | null;
  meta?: ReportMeta;
  today: string;
}) {
  const fields: Array<{ label: string; value: string | null | undefined }> = [
    { label: "Student", value: name },
    { label: "Grade", value: snapshot?.grade_level ?? null },
    { label: "School", value: meta?.school ?? null },
    {
      label: "Graduation",
      value:
        (meta?.graduationYear ? String(meta.graduationYear) : null) ??
        snapshot?.graduation_timeline ??
        null,
    },
    {
      label: "Readiness",
      value: readiness ? READINESS_LABEL[readiness] ?? readiness : null,
    },
    { label: "Confidence", value: confidenceLabel },
    { label: "Last Updated", value: meta?.lastUpdated ?? meta?.issued ?? today },
    { label: "Next Review", value: meta?.nextReviewDate ?? null },
  ];
  const visible = fields.filter((f) => f.value);
  if (visible.length === 0) return null;
  return (
    <section
      aria-label="Student Snapshot"
      className="mt-8 border-y border-[color:var(--pub-rule-soft,theme(colors.border))] py-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-dotted border-[color:var(--pub-rule-soft,theme(colors.border))] pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Student Snapshot
        </p>
        {readiness && <ReadinessBadge level={readiness} compact />}
      </div>
      <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((f) => (
          <div key={f.label} className="border-l border-[color:var(--pub-rule-soft,theme(colors.border))] pl-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {f.label}
            </dt>
            <dd className="mt-1 font-display text-base leading-snug text-foreground/90">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------- Small primitives ---------- */

function AudienceTab({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
      <span className="hidden text-xs font-normal text-muted-foreground sm:inline">· {hint}</span>
    </button>
  );
}

const BLOCK_TOGGLE_EVENT = "report-blocks-toggle";
function blockStorageKey(id: string) {
  return `tf:report-block:${id}`;
}

function Block({
  title,
  children,
  icon,
  id,
  eyebrow,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  id?: string;
  eyebrow?: string;
}) {
  const collapsible = Boolean(id);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!id || typeof window === "undefined") return;
    const stored = window.localStorage.getItem(blockStorageKey(id));
    if (stored === "1") setCollapsed(true);
  }, [id]);

  useEffect(() => {
    if (!id || typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ open: boolean }>).detail;
      if (!detail) return;
      const nextCollapsed = !detail.open;
      setCollapsed(nextCollapsed);
      try {
        window.localStorage.setItem(blockStorageKey(id), detail.open ? "0" : "1");
      } catch {
        /* ignore */
      }
      setBlockCollapsed(id, nextCollapsed);
    };
    window.addEventListener(BLOCK_TOGGLE_EVENT, handler as EventListener);
    const openHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (!detail || detail.id !== id) return;
      setCollapsed(false);
      try {
        window.localStorage.setItem(blockStorageKey(id), "0");
      } catch {
        /* ignore */
      }
      setBlockCollapsed(id, false);
    };
    window.addEventListener("report-block-open", openHandler as EventListener);
    const hydrateHandler = (e: Event) => {
      const detail = (e as CustomEvent<CollapsedBlocksHydrationDetail>).detail;
      if (!detail || !Array.isArray(detail.collapsedIds)) return;
      const shouldCollapse = detail.collapsedIds.includes(id);
      setCollapsed(shouldCollapse);
      try {
        window.localStorage.setItem(blockStorageKey(id), shouldCollapse ? "1" : "0");
      } catch {
        /* ignore */
      }
    };
    window.addEventListener(EVT_BLOCKS_HYDRATE, hydrateHandler as EventListener);
    return () => {
      window.removeEventListener(BLOCK_TOGGLE_EVENT, handler as EventListener);
      window.removeEventListener("report-block-open", openHandler as EventListener);
      window.removeEventListener(EVT_BLOCKS_HYDRATE, hydrateHandler as EventListener);
    };
  }, [id]);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (id && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(blockStorageKey(id), next ? "1" : "0");
        } catch {
          /* ignore */
        }
        setBlockCollapsed(id, next);
      }
      return next;
    });
  };

  const contentId = id ? `${id}-content` : undefined;

  return (
    <section
      id={id}
      data-collapsed={collapsible && collapsed ? "true" : "false"}
      className="report-section report-block mt-14 page-break scroll-mt-24"
    >
      <div className="mb-6 border-b border-border/60 pb-4">
        {collapsible ? (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls={contentId}
            className="no-print group flex w-full items-center gap-3 text-left"
          >
            <span className="section-number font-mono text-xs font-semibold tracking-wider text-primary" />
            {icon && <span className="text-primary">{icon}</span>}
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-[1.6rem]">
              {toTitleCase(title)}
            </h2>
            <ChevronDown
              aria-hidden
              className={cn(
                "ml-auto h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-foreground",
                collapsed ? "-rotate-90" : "rotate-0",
              )}
            />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="section-number font-mono text-xs font-semibold tracking-wider text-primary" />
            {icon && <span className="text-primary">{icon}</span>}
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-[1.6rem]">
              {toTitleCase(title)}
            </h2>
          </div>
        )}
        {/* Print-only static header (always visible, no chevron) */}
        {collapsible && (
          <div className="hidden print:flex items-center gap-3">
            <span className="section-number font-mono text-xs font-semibold tracking-wider text-primary" />
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-[1.6rem]">
              {toTitleCase(title)}
            </h2>
          </div>
        )}
        {eyebrow && (
          <p className="mt-1 pl-[1px] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
      </div>
      <div
        id={contentId}
        className={cn("report-block-content", collapsible && collapsed ? "hidden print:block" : "")}
      >
        {children}
      </div>
    </section>
  );
}


function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-snug text-foreground/85">{value}</dd>
    </div>
  );
}

function DocumentContents({
  report,
  name,
  hasLinkedStudent,
  extraItems,
}: {
  report: PathwayReport;
  name: string;
  hasLinkedStudent?: boolean;
  extraItems?: { id: string; label: string }[];
}) {

  const items: { id: string; label: string }[] = [];
  if (report.student_snapshot) items.push({ id: "sec-snapshot", label: "Student Snapshot" });
  items.push({ id: "sec-strengths", label: "Strengths to Lead With" });
  if (report.spin_analysis) items.push({ id: "sec-spin", label: "Strengths, Preferences, Interests & Needs" });
  if (report.readiness_scorecard?.length) items.push({ id: "sec-readiness", label: "Transition Readiness Scorecard" });
  if (report.recommended_pathways?.length) items.push({ id: "sec-pathways", label: "Recommended Pathways" });
  if (report.career_matches?.length) items.push({ id: "sec-careers", label: "Career & Life Pathway Matches" });
  if (report.postsecondary_goals?.length) items.push({ id: "sec-goals", label: "Postsecondary Goal Breakdown" });
  items.push({ id: "sec-education", label: "Education & Training Options" });
  items.push({ id: "sec-life-skills", label: "Life Skills to Focus On" });
  if (report.iep_translator?.length) items.push({ id: "sec-iep-translator", label: "IEP / Transition Plan Translator" });
  if (report.data_gaps?.length) items.push({ id: "sec-data-gaps", label: "What We Still Need to Know" });
  if (report.student_voice_prompts?.length) items.push({ id: "sec-student-voice", label: `In ${name}'s Voice` });
  if (report.family_action_plan) items.push({ id: "sec-family-plan", label: "Family Action Plan" });
  if (report.meeting_prep_toolkit) items.push({ id: "sec-meeting-prep", label: "Next PPT / IEP Meeting Prep" });
  if (hasLinkedStudent) items.push({ id: "sec-partner-suggestions", label: "Partner Suggestions" });
  if (report.opportunity_matches?.length) items.push({ id: "sec-opportunities", label: "Opportunities to Explore" });
  if (report.progress_timeline?.length) items.push({ id: "sec-timeline", label: "Progress Timeline" });
  items.push({ id: "sec-thirty-day", label: "30 / 60 / 90-Day Plan" });
  if (report.needs_human_review?.length) items.push({ id: "sec-review", label: "Worth a Human Second Look" });

  if (extraItems) items.push(...extraItems);

  return (

    <nav
      aria-label="Table of contents"
      className="no-print mt-10 border-t border-[color:var(--pub-rule-soft,theme(colors.border))] pt-6"
    >
      <div className="flex items-baseline justify-between border-b border-dotted border-[color:var(--pub-rule-soft,theme(colors.border))] pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Contents
        </p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {items.length} sections
        </p>
      </div>
      <ol className="grid gap-x-10 gap-y-1 pt-4 sm:grid-cols-2">
        {items.map((it, i) => (
          <li key={it.id} className="flex items-baseline gap-3 text-sm">
            <span className="font-mono text-[11px] tabular-nums text-primary/80">
              {String(i + 1).padStart(2, "0")}
            </span>
            <a
              href={`#${it.id}`}
              className="group flex flex-1 items-baseline gap-2 py-1 text-foreground/85 transition-colors hover:text-foreground"
            >
              <span className="truncate">{it.label}</span>
              <span aria-hidden className="flex-1 translate-y-[-2px] border-b border-dotted border-border/60" />
              <span className="font-mono text-[10px] text-muted-foreground">→</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}


function BulletList({ items, compact = false }: { items: string[]; compact?: boolean }) {
  return (
    <ul
      className={cn(
        "space-y-2 leading-relaxed text-muted-foreground",
        compact ? "mt-1 text-sm" : "mt-2 text-sm",
      )}
    >
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function MiniCard({
  label,
  items,
  compact = false,
  accent = false,
}: {
  label: string;
  items: string[];
  compact?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        accent ? "border-primary/30 bg-primary/5" : "border-border/60 bg-background",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground">{label}</p>
      <BulletList items={items} compact={compact} />
    </div>
  );
}

function HorizonCard({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
      <BulletList items={items} compact />
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2 first:mt-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground">{label}</p>
      <p className="text-sm text-foreground/80">{children}</p>
    </div>
  );
}

function ReadinessBadge({
  level,
  compact = false,
}: {
  level: string;
  compact?: boolean;
}) {
  const tone =
    level === "ready"
      ? "bg-primary/15 text-primary border-primary/30"
      : level === "progressing"
        ? "bg-sky-soft/40 text-foreground border-border"
        : level === "developing"
          ? "bg-muted text-foreground border-border"
          : "bg-amber-100/60 text-amber-900 border-amber-300/60 dark:bg-amber-950/30 dark:text-amber-200";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        tone,
        compact ? "text-[11px]" : "",
      )}
    >
      <Sparkles className="h-3 w-3" />
      {READINESS_LABEL[level] ?? level}
    </span>
  );
}

/* ---------- Floating table of contents (desktop only) ---------- */

function ReportTOC({
  report,
  audience,
  extraItems,
}: {
  report: PathwayReport;
  audience: Audience;
  extraItems?: { id: string; label: string }[];
}) {
  const items: { id: string; label: string }[] = [];
  if (report.student_snapshot) items.push({ id: "sec-snapshot", label: "Student Snapshot" });
  items.push({ id: "sec-strengths", label: "Strengths" });
  if (report.spin_analysis) items.push({ id: "sec-spin", label: "SPIN Analysis" });
  if (report.readiness_scorecard?.length) items.push({ id: "sec-readiness", label: "Readiness" });
  if (report.recommended_pathways?.length) items.push({ id: "sec-pathways", label: "Pathways" });
  if (report.career_matches?.length) items.push({ id: "sec-careers", label: "Career Matches" });
  if (report.postsecondary_goals?.length) items.push({ id: "sec-goals", label: "Postsecondary Goals" });
  items.push({ id: "sec-education", label: "Education & Training" });
  items.push({ id: "sec-life-skills", label: "Life Skills" });
  if (report.iep_translator?.length) items.push({ id: "sec-iep-translator", label: "IEP Translator" });
  if (report.data_gaps?.length) items.push({ id: "sec-data-gaps", label: "What We Still Need" });
  if (report.student_voice_prompts?.length) items.push({ id: "sec-student-voice", label: "Student Voice" });
  if (report.family_action_plan) items.push({ id: "sec-family-plan", label: "Family Plan" });
  if (report.meeting_prep_toolkit) items.push({ id: "sec-meeting-prep", label: "PPT Prep" });
  if (report.opportunity_matches?.length) items.push({ id: "sec-opportunities", label: "Opportunities" });
  if (report.progress_timeline?.length) items.push({ id: "sec-timeline", label: "Timeline" });
  items.push({ id: "sec-thirty-day", label: "30 / 60 / 90-Day Plan" });
  if (report.needs_human_review?.length) items.push({ id: "sec-review", label: "Human Review" });
  if (extraItems) items.push(...extraItems);
  void audience;


  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("report-outline-open");
    if (stored === "1") setOpen(true);
  }, []);
  const outlineHydrated = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("report-outline-open", open ? "1" : "0");
    if (!outlineHydrated.current) {
      outlineHydrated.current = true;
      return;
    }
    queueReportPrefsUpdate({ outline_open: open });
  }, [open]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OutlineSetDetail>).detail;
      if (typeof detail?.open === "boolean") setOpen(detail.open);
    };
    window.addEventListener(EVT_OUTLINE_SET, handler as EventListener);
    return () =>
      window.removeEventListener(EVT_OUTLINE_SET, handler as EventListener);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    const els = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0) return;
    const visible = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio);
          else visible.delete(e.target.id);
        }
        let bestId: string | null = null;
        let bestRatio = -1;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId) setActiveId(bestId);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items.length]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredItems.length]);

  const doJump = (id: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("report-block-open", { detail: { id } }));
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    });
  };

  const jumpTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    doJump(id);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
      setFocusedIndex(-1);
      searchRef.current?.blur();
      return;
    }
    if (filteredItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev < filteredItems.length - 1 ? prev + 1 : 0;
        itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filteredItems.length - 1;
        itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusedIndex(0);
      itemRefs.current[0]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "End") {
      e.preventDefault();
      const last = filteredItems.length - 1;
      setFocusedIndex(last);
      itemRefs.current[last]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetIndex = focusedIndex >= 0 ? focusedIndex : filteredItems.findIndex((it) => it.id === activeId);
      const idx = targetIndex >= 0 ? targetIndex : 0;
      doJump(filteredItems[idx].id);
    }
  };

  const activeDescendantId =
    focusedIndex >= 0 && filteredItems[focusedIndex]
      ? `report-outline-opt-${filteredItems[focusedIndex].id}`
      : undefined;
  const resultsMessage =
    query.trim().length === 0
      ? `${items.length} sections available`
      : filteredItems.length === 0
        ? `No sections match ${query}`
        : `${filteredItems.length} of ${items.length} sections match`;

  // Suppress unused (kept for backward compat with the prior search UX)
  void query; void setQuery; void focusedIndex; void searchRef;
  void onSearchKeyDown; void activeDescendantId; void resultsMessage;

  return (
    <nav
      aria-label="Report outline"
      className="no-print pointer-events-none fixed right-4 top-44 z-20 hidden xl:block"
    >
      <div className="pointer-events-auto flex max-h-[calc(100vh-13rem)] w-44 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/90 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="report-outline-list"
          className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-primary transition-colors hover:bg-muted/40"
        >
          On This Page
          <ChevronDown
            aria-hidden
            className={cn("h-3.5 w-3.5 transition-transform", open ? "rotate-0" : "-rotate-90")}
          />
        </button>
        {open && (
          <ul
            id="report-outline-list"
            aria-label="Report sections"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 py-1.5 text-[12px] [scrollbar-width:thin]"
          >
            {filteredItems.map((it, i) => {
              const isActive = activeId === it.id;
              return (
                <li key={it.id}>
                  <a
                    ref={(el) => { itemRefs.current[i] = el; }}
                    href={`#${it.id}`}
                    onClick={jumpTo(it.id)}
                    aria-current={isActive ? "location" : undefined}
                    className={cn(
                      "block rounded-md border-l-2 px-2 py-1 leading-snug transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {it.label}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}

function PlanBlock({
  report,
  extendedPlans,
}: {
  report: PathwayReport;
  extendedPlans?: import("@/lib/demo-extended-plans").ExtendedPlans;
}) {
  const [horizon, setHorizon] = useState<PlanHorizon>("thirty");
  const meta = HORIZON_META[horizon];

  // Always render a rich 30/60/90 view. If no curated plan was provided
  // (signed-in / real reports), synthesize one from the report itself so
  // each horizon reflects this student's actual goals and action plan.
  const plans = extendedPlans ?? buildExtendedPlansFromReport(report);

  const steps = plans[horizon];
  const counts: Record<PlanHorizon, number> = {
    thirty: plans.thirty.length,
    sixty: plans.sixty.length,
    ninety: plans.ninety.length,
  };

  return (
    <Block id="sec-thirty-day" title="30 / 60 / 90-Day Action Plan" icon={<Calendar className="h-5 w-5" />}>
      <div className="flex flex-wrap items-center gap-3">
        <PlanHorizonTabs value={horizon} onChange={setHorizon} counts={counts} />
        <p className="text-xs text-muted-foreground">{meta.tagline}</p>
      </div>
      <ol className="mt-5 space-y-4">
        {steps.map((step) => (
          <RichPlanStepCard key={`${horizon}-${step.week}`} step={step} />
        ))}
      </ol>
    </Block>
  );
}


