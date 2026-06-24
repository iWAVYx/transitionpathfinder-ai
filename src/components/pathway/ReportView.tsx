import { useEffect, useMemo, useRef, useState } from "react";
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
}) {
  const [audience, setAudienceState] = useState<Audience>(initialAudience ?? "family");
  const setAudience = (a: Audience) => {
    setAudienceState(a);
    onAudienceChange?.(a);
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
    if (v === "student" || v === "family" || v === "educator") setAudience(v);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", audience);
    window.history.replaceState({}, "", url.toString());
  }, [audience]);

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

      <ReportTOC report={r} audience={audience} />

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

      {/* Toolbar — hidden on print */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-2 shadow-soft">
        <div
          role="tablist"
          aria-label="Choose a report view"
          className="inline-flex rounded-xl bg-muted p-1"
        >
          <AudienceTab
            active={audience === "student"}
            onClick={() => setAudience("student")}
            icon={<MessageSquareQuote className="h-4 w-4" />}
            label="Student View"
            hint="For You"
          />
          <AudienceTab
            active={audience === "family"}
            onClick={() => setAudience("family")}
            icon={<Users className="h-4 w-4" />}
            label="Family View"
            hint="Plain Language"
          />
          <AudienceTab
            active={audience === "educator"}
            onClick={() => setAudience("educator")}
            icon={<GraduationCap className="h-4 w-4" />}
            label="Educator View"
            hint="PPT Prep"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Report density"
            className="inline-flex rounded-lg border bg-muted/50 p-0.5"
          >
            <button
              type="button"
              onClick={() => setDensity("compact")}
              aria-pressed={density === "compact"}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
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
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                density === "comfortable"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Comfortable
            </button>
          </div>
          <div className="inline-flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof window !== "undefined")
                  window.dispatchEvent(
                    new CustomEvent("report-blocks-toggle", { detail: { open: true } }),
                  );
              }}
              aria-label="Expand all sections"
            >
              <ChevronsUpDown className="h-4 w-4" /> Expand all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof window !== "undefined")
                  window.dispatchEvent(
                    new CustomEvent("report-blocks-toggle", { detail: { open: false } }),
                  );
              }}
              aria-label="Collapse all sections"
            >
              <ChevronsDownUp className="h-4 w-4" /> Collapse all
            </Button>
          </div>

          {onSaveToProfile && (
            <Button
              variant={saved ? "outline" : "secondary"}
              size="sm"
              onClick={onSaveToProfile}
              disabled={saved}
              aria-label="Save to Student Profile"
            >
              {saved ? <Check className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
              {saved ? "Saved" : saveLabel ?? "Save to Profile"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={shareReport} aria-label="Share Pathway Report">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Share With Team"}
          </Button>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh Pathway Report"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing…" : "Refresh Report"}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            aria-label="Download Pathway Report as PDF"
          >
            <Download className="h-4 w-4" /> Download Pathway Report (PDF)
          </Button>
        </div>
      </div>

      {/* ============ Document header (formal) ============ */}
      <header
        ref={headerRef}
        className="report-header relative overflow-hidden rounded-2xl border bg-card shadow-soft"
      >
        {/* Parallax glow layers (decorative) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0"
          style={{ transform: `translate3d(0, ${parallaxY * 0.5}px, 0)` }}
        >
          <div className="absolute -top-32 -right-24 h-[22rem] w-[22rem] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-20 h-[20rem] w-[20rem] rounded-full bg-sky-soft/40 blur-3xl" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />

        <div className="relative border-b border-border/60 bg-muted/40 px-6 py-3 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            <span>TransitionForward · {audience === "family" ? "Pathway Report" : "Educator PPT Prep Packet"}</span>
            <span className="font-mono normal-case tracking-normal text-foreground/70">
              Doc ID {meta?.reportId ?? "—"} · v{meta?.version ?? "1.0"}
            </span>
          </div>
        </div>

        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            {audience === "family" ? "Personalized Transition Plan" : "Planning & Placement Team Packet"}
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
            {toTitleCase(heading)}
          </h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-foreground/75">{subheading}</p>

          <div className="mt-5 h-px w-16 bg-primary/70" />

          <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            <MetaField label="Prepared For" value={meta?.preparedFor ?? name} />
            <MetaField label="Prepared By" value={meta?.preparedBy ?? "TransitionForward (AI-supported, human-led)"} />
            <MetaField label="Date Issued" value={meta?.issued ?? today} />
            <MetaField
              label="Confidentiality"
              value={meta?.confidentiality ?? "For the student, family, and authorized educators"}
            />
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            {confidenceLabel && (
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                {confidenceLabel}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" /> AI-drafted · educator-reviewable
            </Badge>
            <Badge variant="outline" className="gap-1">
              <BookOpen className="h-3 w-3" /> {audience === "family" ? "Family-Friendly Language" : "PPT-Ready Format"}
            </Badge>
          </div>
        </div>
      </header>

      {/* ============ Student Snapshot summary card (top, all audiences) ============ */}
      <StudentSnapshotCard
        name={name}
        snapshot={r.student_snapshot}
        readiness={r.student_snapshot?.readiness_level ?? null}
        confidenceLabel={confidenceLabel}
        meta={meta}
        today={today}
      />

      <div className="mt-8">
        <AIDisclaimer />
      </div>

      {/* ============ Inline numbered Table of Contents ============ */}
      <DocumentContents report={r} name={name} hasLinkedStudent={!!studentId} />


      {/* ============ Executive Summary ============ */}
      <section className="mt-10 page-break exec-summary">
        <div className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-soft sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="relative flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-medium tracking-tight">
              Executive Summary
            </h2>
          </div>
          <p className="relative mt-3 text-base leading-relaxed text-foreground/85">
            {r.summary}
          </p>
          <div className="relative mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background p-5 transition-shadow hover:shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Top Strengths
              </p>
              {topStrengths.length > 0 ? (
                <ul className="mt-2 space-y-1.5 text-sm text-foreground/85">
                  {topStrengths.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  See the strengths section below.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-border/60 bg-background p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Best-Fit Direction
              </p>
              {bestFitPathway ? (
                <>
                  <p className="mt-2 font-display text-lg leading-snug">
                    {toTitleCase(bestFitPathway.title)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-4">
                    {bestFitPathway.why_it_fits}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  See recommended pathways below.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-border/60 bg-background p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Start Here This Week
              </p>
              {topNextSteps.length > 0 ? (
                <ol className="mt-2 space-y-1.5 text-sm text-foreground/85">
                  {topNextSteps.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-semibold text-primary">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  See the 30-Day Plan below.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>


      {/* ============ Student Snapshot ============ */}
      {r.student_snapshot && (
        <Block id="sec-snapshot" title="Student Snapshot" icon={<Compass className="h-5 w-5" />}>
          <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl">{toTitleCase(name)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.student_snapshot.grade_level} · {r.student_snapshot.graduation_timeline}
                </p>
              </div>
              <ReadinessBadge level={r.student_snapshot.readiness_level} />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 grid-sym-2">
              <MiniCard label="Primary Interests" items={r.student_snapshot.primary_interests} />
              <MiniCard
                label="Learning Preferences"
                items={r.student_snapshot.learning_preferences}
              />
              <MiniCard label="Family Priorities" items={r.student_snapshot.family_priorities} />
              <div className="rounded-2xl border border-border/60 bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Communication Style
                </p>
                <p className="mt-2 text-sm text-foreground/80">
                  {r.student_snapshot.communication_style}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border/60 bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Where {name} is now
              </p>
              <p className="mt-2 text-sm text-foreground/80">
                {r.student_snapshot.current_transition_status}
              </p>
            </div>

            <figure className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-5">
              <Quote className="h-4 w-4 text-primary" />
              <blockquote className="mt-2 font-display text-lg italic leading-snug text-foreground/85">
                "{r.student_snapshot.student_voice_quote}"
              </blockquote>
              <figcaption className="mt-2 text-xs text-muted-foreground">In {name}'s voice</figcaption>
            </figure>
          </div>
        </Block>
      )}

      {/* ============ SPIN Analysis ============ */}
      {r.spin_analysis && (
        <Block id="sec-spin" title="Strengths, Preferences, Interests & Needs" icon={<Sparkles className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniCard label="Strengths" items={r.spin_analysis.strengths} accent />
            <MiniCard label="Preferences" items={r.spin_analysis.preferences} />
            <MiniCard label="Interests" items={r.spin_analysis.interests} />
            <MiniCard label="Needs" items={r.spin_analysis.needs} />
            <MiniCard label="Motivators" items={r.spin_analysis.motivators} />
            <MiniCard label="Barriers" items={r.spin_analysis.barriers} />
            <MiniCard label="Environmental Supports" items={r.spin_analysis.environmental_supports} />
            <MiniCard label="Areas for Growth" items={r.spin_analysis.areas_for_growth} />
          </div>
          <div className="mt-4 rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              What This Means for Planning
            </p>
            <p className="mt-2 text-sm text-foreground/80">{r.spin_analysis.what_this_means}</p>
          </div>
        </Block>
      )}

      {/* ============ Strengths to Lead With (always) ============ */}
      <Block id="sec-strengths" title="Strengths to Lead With" icon={<HeartHandshake className="h-5 w-5" />}>
        <BulletList items={r.strengths_snapshot} />
      </Block>

      {/* ============ Readiness scorecard ============ */}
      {r.readiness_scorecard && r.readiness_scorecard.length > 0 && (
        <Block id="sec-readiness" title="Transition Readiness Scorecard" icon={<Target className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-muted-foreground">
            A strengths-based snapshot. These are conversation starters, not grades.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 grid-sym-2">
            {r.readiness_scorecard.map((row) => (
              <div
                key={row.category}
                className="rounded-2xl border border-border/60 bg-card p-5 lift-card"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg">{toTitleCase(row.category)}</h3>
                  <ReadinessBadge level={row.level} compact />
                </div>
                <Progress
                  value={READINESS_PCT[row.level] ?? 50}
                  className="mt-3 h-2"
                  aria-label={`${toTitleCase(row.category)} readiness: ${row.level}`}
                />
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-primary">
                  What We Saw
                </p>
                <p className="text-sm text-muted-foreground">{row.evidence}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  What It Means
                </p>
                <p className="text-sm text-muted-foreground">{row.what_it_means}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  Next Growth Step
                </p>
                <p className="text-sm text-foreground/80">{row.growth_activity}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  Possible Goal
                </p>
                <p className="text-sm text-foreground/80">{row.suggested_goal}</p>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* ============ Recommended Pathways ============ */}
      {r.recommended_pathways && r.recommended_pathways.length > 0 && (
        <Block id="sec-pathways" title="Recommended Pathways" icon={<RouteIcon className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-muted-foreground">
            Multiple realistic directions — not just one. Each pathway has supports, steps, and a
            timeline.
          </p>
          <div className="grid gap-4">
            {r.recommended_pathways.map((p) => (
              <div
                key={p.title}
                className="rounded-3xl border bg-card p-6 shadow-soft lift-card"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={p.type === "best-fit" ? "default" : "secondary"}
                    className="uppercase tracking-wider"
                  >
                    {PATHWAY_TYPE_LABEL[p.type] ?? p.type}
                  </Badge>
                  <h3 className="font-display text-2xl">{toTitleCase(p.title)}</h3>
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
                <p className="mt-3 text-sm text-foreground/80">{p.why_it_fits}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <MiniCard label="Builds on These Strengths" items={p.related_strengths} />
                  <MiniCard label="Possible Barriers" items={p.possible_barriers} />
                  <MiniCard label="Supports Needed" items={p.supports_needed} />
                  <MiniCard label="At School" items={p.school_experiences} />
                  <MiniCard label="In the Community" items={p.community_experiences} />
                  <MiniCard label="Courses & Programs" items={p.courses_or_programs} />
                  <MiniCard label="Career Clusters" items={p.career_clusters} />
                  <MiniCard label="Credentials" items={p.credentials} />
                  <MiniCard label="Partner Resources" items={p.partner_resources} />
                </div>

                <div className="mt-5 rounded-2xl bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Action Steps
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <HorizonCard label="30 days" items={p.action_steps.thirty_day} />
                    <HorizonCard label="90 days" items={p.action_steps.ninety_day} />
                    <HorizonCard label="6 months" items={p.action_steps.six_month} />
                    <HorizonCard label="1 year" items={p.action_steps.one_year} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* ============ Career Matches ============ */}
      {r.career_matches && r.career_matches.length > 0 && (
        <Block id="sec-careers" title="Career & Life Pathway Matches" icon={<Briefcase className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-2 grid-sym-2">
            {r.career_matches.map((c) => (
              <div key={c.cluster} className="rounded-2xl border bg-card p-5 lift-card">
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
                <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm">
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

      {/* ============ Postsecondary Goal Breakdown ============ */}
      {r.postsecondary_goals && r.postsecondary_goals.length > 0 && (
        <Block id="sec-goals" title="Postsecondary Goal Breakdown" icon={<Target className="h-5 w-5" />}>
          <Accordion type="multiple" className="rounded-2xl border bg-card">
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

      {/* ============ Classic career pathways (only when no modern equivalent) ============ */}
      {(!r.recommended_pathways || r.recommended_pathways.length === 0) &&
        (!r.career_matches || r.career_matches.length === 0) && (
        <Block title="Career Pathways to Explore" icon={<Compass className="h-5 w-5" />}>
          <div className="grid gap-4">
            {r.career_pathways.map((p) => (
              <div key={p.title} className="rounded-2xl border border-border/60 bg-card p-5 lift-card">
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

      <Block id="sec-life-skills" title="Life Skills to Focus On" icon={<Lightbulb className="h-5 w-5" />}>
        <BulletList items={r.life_skills_focus} />
      </Block>

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
              <div key={i} className="rounded-2xl border bg-card p-5 lift-card">
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

      {/* ============ Phase 6D — Your Voice in this plan (Student tab) ============ */}
      {audience === "student" && voiceResponses.length > 0 && (
        <Block
          id="sec-your-voice"
          title="Your Voice in this Plan"
          icon={<Quote className="h-5 w-5" />}
        >
          <p className="mb-4 text-sm text-muted-foreground">
            These are your own words from Student Voice — they help shape this plan.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {voiceResponses.slice(0, 3).map((vr) => {
              const prompt = STUDENT_VOICE_PROMPTS.find((p) => p.key === vr.prompt_key);
              return (
                <div key={vr.id} className="rounded-2xl border bg-primary/5 p-5 lift-card">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {prompt?.question ?? vr.prompt_key}
                  </p>
                  <p className="mt-2 font-display text-base italic text-foreground/90">
                    "{vr.response_text}"
                  </p>
                </div>
              );
            })}
          </div>
        </Block>
      )}

      {/* ============ Student Voice Prompts ============ */}
      {r.student_voice_prompts && r.student_voice_prompts.length > 0 && (
        <Block id="sec-student-voice" title={`In ${name}'s Voice`} icon={<MessageSquareQuote className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-muted-foreground">
            Questions for {name} to think through — alone, with family, or with a teacher.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 grid-sym-2">
            {r.student_voice_prompts.map((p, i) => (
              <div key={i} className="rounded-2xl border bg-card p-5 lift-card">
                <p className="font-display text-lg">{p.prompt}</p>
                <p className="mt-2 text-sm text-muted-foreground">{p.suggested_reflection}</p>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* ============ Family Action Plan ============ */}
      {!hasV2 && r.family_action_plan && (
        <Block id="sec-family-plan" title="Family Action Plan" icon={<HeartHandshake className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <HorizonCard label="This Week" items={r.family_action_plan.this_week} />
            <HorizonCard label="This Month" items={r.family_action_plan.this_month} />
            <HorizonCard
              label="Before the Next Meeting"
              items={r.family_action_plan.before_next_meeting}
            />
            <HorizonCard
              label="This School Year"
              items={r.family_action_plan.this_school_year}
            />
            <HorizonCard
              label="Before Graduation"
              items={r.family_action_plan.before_graduation}
            />
          </div>
        </Block>
      )}

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

      {/* ============ Meeting prep toolkit ============ */}
      {!hasV2 && r.meeting_prep_toolkit && (
        <Block id="sec-meeting-prep" title="Next PPT / IEP Meeting Prep" icon={<ListChecks className="h-5 w-5" />}>
          <div className="rounded-3xl border bg-card p-6 shadow-soft lift-card">
            <div className="grid gap-4 sm:grid-cols-2 grid-sym-2">
              <MiniCard
                label="Questions to Ask"
                items={r.meeting_prep_toolkit.questions_to_ask}
              />
              <MiniCard
                label="Documents to Bring"
                items={r.meeting_prep_toolkit.documents_to_bring}
              />
              <MiniCard
                label="Concerns to Raise"
                items={r.meeting_prep_toolkit.concerns_to_raise}
              />
              <MiniCard
                label="Strengths to Highlight"
                items={r.meeting_prep_toolkit.strengths_to_highlight}
              />
              <MiniCard
                label="Goals to Review"
                items={r.meeting_prep_toolkit.goals_to_review}
              />
              <MiniCard
                label="Services to Discuss"
                items={r.meeting_prep_toolkit.services_to_discuss}
              />
              <MiniCard
                label="Student Voice Prompts"
                items={r.meeting_prep_toolkit.student_voice_prompts}
              />
              <MiniCard label="Follow-up Items" items={r.meeting_prep_toolkit.follow_up_items} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Tip: print this section as a one-page checklist to bring to the meeting.
            </p>
          </div>
        </Block>
      )}

      {/* ============ Questions to bring (only when no toolkit) ============ */}
      {!r.meeting_prep_toolkit && (
        <Block title="Questions to Bring to the Next PPT" icon={<ListChecks className="h-5 w-5" />}>
          <BulletList items={r.family_questions_for_ppt} />
        </Block>
      )}

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

      {/* ============ Opportunity matches ============ */}
      {!hasV2 && r.opportunity_matches && r.opportunity_matches.length > 0 && (
        <Block id="sec-opportunities" title="Opportunities to Explore" icon={<MapIcon className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2 grid-sym-2">
            {r.opportunity_matches.map((o, i) => (
              <div key={i} className="rounded-2xl border bg-card p-5 lift-card">
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
                <div className="rounded-2xl border bg-card p-5 lift-card">
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

      {/* ============ 30 / 60 / 90 Day Plan (always) ============ */}
      <PlanBlock report={r} extendedPlans={extendedPlans} />


      {/* ============ Teacher next steps (only when no teacher_action_plan) ============ */}
      {audience === "educator" && !r.teacher_action_plan && (
        <Block title="Teacher Next Steps" icon={<GraduationCap className="h-5 w-5" />}>
          <BulletList items={r.teacher_next_steps} />
        </Block>
      )}

      {/* ============ Needs human review ============ */}
      {r.needs_human_review && r.needs_human_review.length > 0 && (
        <Block id="sec-review" title="Worth a Human Second Look" icon={<ShieldCheck className="h-5 w-5" />}>
          <div className="rounded-2xl border border-amber-400/40 bg-amber-50/40 p-5 dark:bg-amber-950/10">
            <p className="text-sm text-muted-foreground">
              These items are the AI's best guess based on the intake. Please review with the
              student, family, or school team before acting on them.
            </p>
            <BulletList items={r.needs_human_review} />
          </div>
        </Block>
      )}

      {/* ============ Connect to plan: push items into Actions/Calendar ============ */}
      {!demo && (
        <ConnectToPlan
          report={displayReport}
          studentId={studentId}
          reportId={meta?.reportId}
        />
      )}

      {/* ============ Closing note (formal) ============ */}
      <section className="report-section mt-10">
        <div className="rounded-2xl border border-border/60 bg-gradient-hero p-8 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            A closing note for {name}
          </p>
          <p className="mt-3 font-display text-xl leading-relaxed text-foreground/85 sm:text-2xl">
            {r.encouragement_to_student}
          </p>
        </div>
      </section>

      {/* ============ Document footer / control ============ */}
      <footer className="mt-10 rounded-2xl border bg-card">
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
        <Button onClick={() => window.print()} aria-label="Download Pathway Report as PDF">
          <Download className="h-4 w-4" /> Download Pathway Report (PDF)
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
      `}</style>
    </section>
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
      className="mt-6 rounded-2xl border border-primary/20 bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Student Snapshot
        </p>
        {readiness && <ReadinessBadge level={readiness} compact />}
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((f) => (
          <div key={f.label}>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {f.label}
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground/90">{f.value}</dd>
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
}: {
  report: PathwayReport;
  name: string;
  hasLinkedStudent?: boolean;
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

  return (
    <nav
      aria-label="Table of contents"
      className="no-print mt-8 rounded-2xl border bg-card"
    >
      <div className="border-b border-border/60 px-6 py-3 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Contents
        </p>
      </div>
      <ol className="grid gap-x-8 gap-y-2 px-6 py-5 sm:grid-cols-2 sm:px-8">
        {items.map((it, i) => (
          <li key={it.id} className="flex items-baseline gap-3 text-sm">
            <span className="font-mono text-xs text-primary">
              {String(i + 1).padStart(2, "0")}
            </span>
            <a
              href={`#${it.id}`}
              className="flex-1 border-b border-dotted border-border/60 pb-1 text-foreground/80 transition-colors hover:text-foreground"
            >
              {it.label}
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
}: {
  report: PathwayReport;
  audience: Audience;
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
  void audience;

  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("report-outline-open");
    if (stored === "0") setOpen(false);
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

  return (
    <nav
      aria-label="Report outline"
      className={cn(
        "no-print pointer-events-none fixed right-4 top-24 z-20 hidden lg:block",
      )}
    >
      <div className="pointer-events-auto flex max-h-[calc(100vh-7rem)] w-64 flex-col rounded-2xl border border-border/60 bg-card/95 shadow-soft backdrop-blur">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Report Outline
          </p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="report-outline-list"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronDown
              aria-hidden
              className={cn("h-4 w-4 transition-transform", open ? "rotate-0" : "-rotate-90")}
            />
            <span className="sr-only">{open ? "Hide outline" : "Show outline"}</span>
          </button>
        </div>
        {open && (
          <>
            <div className="border-b border-border/60 px-3 py-2">
              <label htmlFor="report-outline-search" className="sr-only">
                Search report sections
              </label>
              <p id="report-outline-search-help" className="sr-only">
                Type to filter sections. Use Up and Down arrow keys to move through results, Enter to jump to the selected section, Escape to clear.
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  ref={searchRef}
                  id="report-outline-search"
                  type="text"
                  role="combobox"
                  aria-expanded={filteredItems.length > 0}
                  aria-controls="report-outline-list"
                  aria-autocomplete="list"
                  aria-activedescendant={activeDescendantId}
                  aria-describedby="report-outline-search-help report-outline-status"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Find section…"
                  className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <p
                id="report-outline-status"
                role="status"
                aria-live="polite"
                className="sr-only"
              >
                {resultsMessage}
              </p>
            </div>
            <ul
              id="report-outline-list"
              role="listbox"
              aria-label="Report sections"
              aria-activedescendant={activeDescendantId}
              className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3 text-sm"
            >
              {filteredItems.map((it, i) => {
                const isActive = activeId === it.id;
                const isFocused = focusedIndex === i;
                const optionId = `report-outline-opt-${it.id}`;
                return (
                  <li key={it.id} role="presentation">
                    <a
                      ref={(el) => { itemRefs.current[i] = el; }}
                      id={optionId}
                      href={`#${it.id}`}
                      onClick={jumpTo(it.id)}
                      role="option"
                      aria-selected={isFocused}
                      aria-current={isActive ? "location" : undefined}
                      tabIndex={-1}
                      className={cn(
                        "flex items-baseline gap-2 rounded-md border-l-2 px-2 py-1.5 transition-colors outline-none",
                        isActive
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
                        isFocused && "ring-1 ring-primary/60",
                        "focus-visible:ring-2 focus-visible:ring-primary",
                      )}
                    >
                      <span aria-hidden className="w-5 shrink-0 font-mono text-[10px] text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="leading-snug">
                        {it.label}
                        {isActive && <span className="sr-only"> (current section)</span>}
                      </span>
                    </a>
                  </li>
                );
              })}
              {filteredItems.length === 0 && (
                <li role="presentation" className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No sections match “{query}”
                </li>
              )}
            </ul>
          </>
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


