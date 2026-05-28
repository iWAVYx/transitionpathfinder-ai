import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Printer,
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
import { cn } from "@/lib/utils";

type Audience = "family" | "educator";

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

export function ReportView({
  name,
  report,
  onReset,
  resetLabel = "Create another report",
  initialAudience,
}: {
  name: string;
  report: PathwayReport;
  onReset?: () => void;
  resetLabel?: string;
  initialAudience?: Audience;
}) {
  const [audience, setAudience] = useState<Audience>(initialAudience ?? "family");
  const [copied, setCopied] = useState(false);
  const [displayReport, setDisplayReport] = useState<PathwayReport>(report);
  const [translatedTo, setTranslatedTo] = useState<SupportedLanguage | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    if (v === "family" || v === "educator") setAudience(v);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", audience);
    window.history.replaceState({}, "", url.toString());
  }, [audience]);

  const heading = useMemo(
    () =>
      audience === "family" ? `A plan for ${name}.` : `PPT prep packet — ${name}`,
    [audience, name],
  );

  const subheading =
    audience === "family"
      ? displayReport.summary
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

  const r = displayReport;

  return (
    <section className="report-root mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Toolbar — hidden on print */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-2 shadow-soft">
        <div
          role="tablist"
          aria-label="Choose a report view"
          className="inline-flex rounded-xl bg-muted p-1"
        >
          <AudienceTab
            active={audience === "family"}
            onClick={() => setAudience("family")}
            icon={<Users className="h-4 w-4" />}
            label="Family view"
            hint="Plain language"
          />
          <AudienceTab
            active={audience === "educator"}
            onClick={() => setAudience("educator")}
            icon={<GraduationCap className="h-4 w-4" />}
            label="Educator view"
            hint="PPT prep"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyLink} aria-label="Copy shareable link">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Link copied" : "Copy link"}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / save as PDF
          </Button>
        </div>
      </div>

      {/* Header card */}
      <div
        className={cn(
          "rounded-3xl p-8 shadow-soft sm:p-10",
          audience === "family" ? "bg-gradient-hero" : "border bg-card",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {audience === "family" ? "Pathway Report" : "Educator PPT Prep"}
          </p>
          {r.confidence_level && (
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              {r.confidence_level === "high"
                ? "High confidence"
                : r.confidence_level === "moderate"
                  ? "Moderate confidence"
                  : "Lower confidence"}
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" /> AI-supported · human-led
          </Badge>
        </div>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          {heading}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-foreground/80">{subheading}</p>
        <div className="mt-4 hidden text-xs text-muted-foreground print:block">
          Generated by TransitionForward · {new Date().toLocaleDateString()}
        </div>
      </div>

      <div className="mt-6">
        <AIDisclaimer />
      </div>

      {/* ============ Student Snapshot ============ */}
      {r.student_snapshot && (
        <Block title="Student snapshot" icon={<Compass className="h-5 w-5" />}>
          <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl">{name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.student_snapshot.grade_level} · {r.student_snapshot.graduation_timeline}
                </p>
              </div>
              <ReadinessBadge level={r.student_snapshot.readiness_level} />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <MiniCard label="Primary interests" items={r.student_snapshot.primary_interests} />
              <MiniCard
                label="Learning preferences"
                items={r.student_snapshot.learning_preferences}
              />
              <MiniCard label="Family priorities" items={r.student_snapshot.family_priorities} />
              <div className="rounded-2xl border border-border/60 bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Communication style
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

            <div className="mt-4 rounded-2xl bg-gradient-hero p-5">
              <Quote className="h-5 w-5 text-primary" />
              <p className="mt-2 font-display text-lg italic text-foreground/90">
                "{r.student_snapshot.student_voice_quote}"
              </p>
              <p className="mt-2 text-xs text-muted-foreground">In {name}'s voice</p>
            </div>
          </div>
        </Block>
      )}

      {/* ============ SPIN analysis ============ */}
      {r.spin_analysis && (
        <Block title="Strengths, preferences, interests & needs" icon={<Sparkles className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniCard label="Strengths" items={r.spin_analysis.strengths} accent />
            <MiniCard label="Preferences" items={r.spin_analysis.preferences} />
            <MiniCard label="Interests" items={r.spin_analysis.interests} />
            <MiniCard label="Needs" items={r.spin_analysis.needs} />
            <MiniCard label="Motivators" items={r.spin_analysis.motivators} />
            <MiniCard label="Barriers" items={r.spin_analysis.barriers} />
            <MiniCard label="Environmental supports" items={r.spin_analysis.environmental_supports} />
            <MiniCard label="Areas for growth" items={r.spin_analysis.areas_for_growth} />
          </div>
          <div className="mt-4 rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              What this means for planning
            </p>
            <p className="mt-2 text-sm text-foreground/80">{r.spin_analysis.what_this_means}</p>
          </div>
        </Block>
      )}

      {/* ============ Strengths to lead with (always) ============ */}
      <Block title="Strengths to lead with" icon={<HeartHandshake className="h-5 w-5" />}>
        <BulletList items={r.strengths_snapshot} />
      </Block>

      {/* ============ Readiness scorecard ============ */}
      {r.readiness_scorecard && r.readiness_scorecard.length > 0 && (
        <Block title="Transition readiness scorecard" icon={<Target className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-muted-foreground">
            A strengths-based snapshot. These are conversation starters, not grades.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {r.readiness_scorecard.map((row) => (
              <div
                key={row.category}
                className="rounded-2xl border border-border/60 bg-card p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-display text-lg">{row.category}</h4>
                  <ReadinessBadge level={row.level} compact />
                </div>
                <Progress value={READINESS_PCT[row.level] ?? 50} className="mt-3 h-2" />
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-primary">
                  What we saw
                </p>
                <p className="text-sm text-muted-foreground">{row.evidence}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  What it means
                </p>
                <p className="text-sm text-muted-foreground">{row.what_it_means}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  Next growth step
                </p>
                <p className="text-sm text-foreground/80">{row.growth_activity}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  Possible goal
                </p>
                <p className="text-sm text-foreground/80">{row.suggested_goal}</p>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* ============ Recommended pathways ============ */}
      {r.recommended_pathways && r.recommended_pathways.length > 0 && (
        <Block title="Recommended pathways" icon={<RouteIcon className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-muted-foreground">
            Multiple realistic directions — not just one. Each pathway has supports, steps, and a
            timeline.
          </p>
          <div className="grid gap-4">
            {r.recommended_pathways.map((p) => (
              <div
                key={p.title}
                className="rounded-3xl border bg-card p-6 shadow-soft"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={p.type === "best-fit" ? "default" : "secondary"}
                    className="uppercase tracking-wider"
                  >
                    {PATHWAY_TYPE_LABEL[p.type] ?? p.type}
                  </Badge>
                  <h3 className="font-display text-2xl">{p.title}</h3>
                </div>
                <p className="mt-3 text-sm text-foreground/80">{p.why_it_fits}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <MiniCard label="Builds on these strengths" items={p.related_strengths} />
                  <MiniCard label="Possible barriers" items={p.possible_barriers} />
                  <MiniCard label="Supports needed" items={p.supports_needed} />
                  <MiniCard label="At school" items={p.school_experiences} />
                  <MiniCard label="In the community" items={p.community_experiences} />
                  <MiniCard label="Courses & programs" items={p.courses_or_programs} />
                  <MiniCard label="Career clusters" items={p.career_clusters} />
                  <MiniCard label="Credentials" items={p.credentials} />
                  <MiniCard label="Partner resources" items={p.partner_resources} />
                </div>

                <div className="mt-5 rounded-2xl bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Action steps
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

      {/* ============ Career matches ============ */}
      {r.career_matches && r.career_matches.length > 0 && (
        <Block title="Career & life pathway matches" icon={<Briefcase className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-2">
            {r.career_matches.map((c) => (
              <div key={c.cluster} className="rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-display text-xl">{c.cluster}</h4>
                  <ReadinessBadge level={c.readiness_level} compact />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <MiniCard label="Example jobs" items={c.example_jobs} compact />
                  <MiniCard label="Skills used" items={c.skills_required} compact />
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <p>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Education / training
                    </span>
                    <br />
                    <span className="text-foreground/80">{c.education_needed}</span>
                  </p>
                  <p>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Work environment
                    </span>
                    <br />
                    <span className="text-foreground/80">{c.work_environment}</span>
                  </p>
                </div>
                <MiniCard label="Possible accommodations" items={c.accommodations} compact />
                <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Next exploration step
                  </span>
                  <br />
                  {c.next_step}
                </p>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* ============ Postsecondary goal breakdown ============ */}
      {r.postsecondary_goals && r.postsecondary_goals.length > 0 && (
        <Block title="Postsecondary goal breakdown" icon={<Target className="h-5 w-5" />}>
          <Accordion type="multiple" className="rounded-2xl border bg-card">
            {r.postsecondary_goals.map((g, i) => (
              <AccordionItem key={i} value={`goal-${i}`} className="px-5">
                <AccordionTrigger className="text-left">
                  <span className="font-display text-lg">{g.area}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3 pb-2 sm:grid-cols-2">
                    <Labeled label="Current status">{g.current_status}</Labeled>
                    <Labeled label="Suggested direction">{g.suggested_direction}</Labeled>
                    <Labeled label="Why it matters">{g.why_it_matters}</Labeled>
                    <Labeled label="Draft measurable goal">
                      <span className="italic">{g.measurable_goal_language}</span>
                    </Labeled>
                    <MiniCard label="Next steps" items={g.next_steps} compact />
                    <MiniCard label="Who supports" items={g.who_supports} compact />
                    <MiniCard label="Evidence needed" items={g.evidence_needed} compact />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Block>
      )}

      {/* ============ Classic career pathways (back-compat) ============ */}
      <Block title="Career pathways to explore" icon={<Compass className="h-5 w-5" />}>
        <div className="grid gap-4">
          {r.career_pathways.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border/60 bg-card p-5">
              <h3 className="font-display text-xl font-medium">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.why_it_fits}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MiniCard label="Example roles" items={p.example_roles} compact />
                <MiniCard label="First steps" items={p.first_steps} compact />
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Education & training options" icon={<BookOpen className="h-5 w-5" />}>
        <BulletList items={r.education_training_options} />
      </Block>

      <Block title="Life skills to focus on" icon={<Lightbulb className="h-5 w-5" />}>
        <BulletList items={r.life_skills_focus} />
      </Block>

      {/* ============ IEP translator ============ */}
      {r.iep_translator && r.iep_translator.length > 0 && (
        <Block title="IEP / transition plan translator" icon={<BookOpen className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-muted-foreground">
            Plain-English translations of transition-related goal language. This is not legal
            advice and does not replace the school team — it helps families and students arrive
            informed.
          </p>
          <div className="space-y-3">
            {r.iep_translator.map((t, i) => (
              <div key={i} className="rounded-2xl border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Goal language
                </p>
                <p className="mt-1 italic text-foreground/80">"{t.goal_text}"</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Labeled label="What it means">{t.plain_meaning}</Labeled>
                  <Labeled label="Connected to real life">{t.connected_to_real_life}</Labeled>
                  <Labeled label={`What ${name} should know`}>{t.what_student_should_know}</Labeled>
                  <MiniCard label="Connected services" items={t.connected_services} compact />
                  <MiniCard label="Questions to ask" items={t.questions_to_ask} compact />
                  {t.missing_information.length > 0 && (
                    <MiniCard label="Missing info" items={t.missing_information} compact />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* ============ Data gaps ============ */}
      {r.data_gaps && r.data_gaps.length > 0 && (
        <Block title="What we still need to know" icon={<AlertTriangle className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-muted-foreground">
            This report doesn't pretend to know everything. Here's what would sharpen it.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {r.data_gaps.map((g, i) => (
              <div
                key={i}
                className="rounded-2xl border border-amber-400/40 bg-amber-50/40 p-5 dark:bg-amber-950/10"
              >
                <h4 className="font-display text-lg">{g.item}</h4>
                <Labeled label="Why it matters">{g.why_it_matters}</Labeled>
                <Labeled label="Who can help">{g.who_can_help}</Labeled>
                <Labeled label="How to collect">{g.how_to_collect}</Labeled>
                <Labeled label="A question to ask">
                  <span className="italic">{g.question_to_ask}</span>
                </Labeled>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* ============ Student voice prompts ============ */}
      {r.student_voice_prompts && r.student_voice_prompts.length > 0 && (
        <Block title={`In ${name}'s voice`} icon={<MessageSquareQuote className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-muted-foreground">
            Questions for {name} to think through — alone, with family, or with a teacher.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {r.student_voice_prompts.map((p, i) => (
              <div key={i} className="rounded-2xl border bg-card p-5">
                <p className="font-display text-lg">{p.prompt}</p>
                <p className="mt-2 text-sm text-muted-foreground">{p.suggested_reflection}</p>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* ============ Family action plan ============ */}
      {r.family_action_plan && (
        <Block title="Family action plan" icon={<HeartHandshake className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <HorizonCard label="This week" items={r.family_action_plan.this_week} />
            <HorizonCard label="This month" items={r.family_action_plan.this_month} />
            <HorizonCard
              label="Before the next meeting"
              items={r.family_action_plan.before_next_meeting}
            />
            <HorizonCard
              label="This school year"
              items={r.family_action_plan.this_school_year}
            />
            <HorizonCard
              label="Before graduation"
              items={r.family_action_plan.before_graduation}
            />
          </div>
        </Block>
      )}

      {/* ============ Teacher / case manager plan ============ */}
      {r.teacher_action_plan && (
        <Block
          title="Teacher / case manager action plan"
          icon={<GraduationCap className="h-5 w-5" />}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MiniCard label="Goal updates" items={r.teacher_action_plan.goal_updates} />
            <MiniCard
              label="Progress monitoring"
              items={r.teacher_action_plan.progress_monitoring}
            />
            <MiniCard
              label="Assessments to run"
              items={r.teacher_action_plan.assessments_to_run}
            />
            <MiniCard
              label="Classroom activities"
              items={r.teacher_action_plan.classroom_activities}
            />
            <MiniCard
              label="Family communication"
              items={r.teacher_action_plan.family_communication}
            />
            <MiniCard
              label="Student conference Qs"
              items={r.teacher_action_plan.student_conference_questions}
            />
            <MiniCard
              label="Service connections"
              items={r.teacher_action_plan.service_connections}
            />
            <MiniCard label="Accommodations" items={r.teacher_action_plan.accommodations} />
            <MiniCard
              label="Work-based learning"
              items={r.teacher_action_plan.work_based_learning}
            />
          </div>
        </Block>
      )}

      {/* ============ Meeting prep toolkit ============ */}
      {r.meeting_prep_toolkit && (
        <Block title="Next PPT / IEP meeting prep" icon={<ListChecks className="h-5 w-5" />}>
          <div className="rounded-3xl border bg-card p-6 shadow-soft">
            <div className="grid gap-4 sm:grid-cols-2">
              <MiniCard
                label="Questions to ask"
                items={r.meeting_prep_toolkit.questions_to_ask}
              />
              <MiniCard
                label="Documents to bring"
                items={r.meeting_prep_toolkit.documents_to_bring}
              />
              <MiniCard
                label="Concerns to raise"
                items={r.meeting_prep_toolkit.concerns_to_raise}
              />
              <MiniCard
                label="Strengths to highlight"
                items={r.meeting_prep_toolkit.strengths_to_highlight}
              />
              <MiniCard
                label="Goals to review"
                items={r.meeting_prep_toolkit.goals_to_review}
              />
              <MiniCard
                label="Services to discuss"
                items={r.meeting_prep_toolkit.services_to_discuss}
              />
              <MiniCard
                label="Student voice prompts"
                items={r.meeting_prep_toolkit.student_voice_prompts}
              />
              <MiniCard label="Follow-up items" items={r.meeting_prep_toolkit.follow_up_items} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Tip: print this section as a one-page checklist to bring to the meeting.
            </p>
          </div>
        </Block>
      )}

      {/* ============ Questions to bring (back-compat) ============ */}
      <Block title="Questions to bring to the next PPT" icon={<ListChecks className="h-5 w-5" />}>
        <BulletList items={r.family_questions_for_ppt} />
      </Block>

      {/* ============ Opportunity matches ============ */}
      {r.opportunity_matches && r.opportunity_matches.length > 0 && (
        <Block title="Opportunities to explore" icon={<MapIcon className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {r.opportunity_matches.map((o, i) => (
              <div key={i} className="rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="mb-2 uppercase tracking-wider">
                      {o.category}
                    </Badge>
                    <h4 className="font-display text-lg">{o.name}</h4>
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
        <Block title="Progress timeline" icon={<Calendar className="h-5 w-5" />}>
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
                <div className="rounded-2xl border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-display text-lg">{s.stage}</h4>
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

      {/* ============ 30-day plan (always) ============ */}
      <Block title="A gentle 30-day plan" icon={<Calendar className="h-5 w-5" />}>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {r.thirty_day_plan.map((w) => (
            <li key={w.week} className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Week {w.week}
              </p>
              <p className="mt-1 text-sm text-foreground">{w.action}</p>
            </li>
          ))}
        </ol>
      </Block>

      {/* ============ Teacher next steps (back-compat) ============ */}
      {audience === "educator" && (
        <Block title="Teacher next steps" icon={<GraduationCap className="h-5 w-5" />}>
          <BulletList items={r.teacher_next_steps} />
        </Block>
      )}

      {/* ============ Needs human review ============ */}
      {r.needs_human_review && r.needs_human_review.length > 0 && (
        <Block title="Worth a human second look" icon={<ShieldCheck className="h-5 w-5" />}>
          <div className="rounded-2xl border border-amber-400/40 bg-amber-50/40 p-5 dark:bg-amber-950/10">
            <p className="text-sm text-muted-foreground">
              These items are the AI's best guess based on the intake. Please review with the
              student, family, or school team before acting on them.
            </p>
            <BulletList items={r.needs_human_review} />
          </div>
        </Block>
      )}

      {/* ============ Encouragement closing ============ */}
      <div className="mt-10 rounded-3xl border border-border/60 bg-gradient-hero p-8 shadow-soft sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">For {name}</p>
        <p className="mt-3 font-display text-2xl italic text-foreground/90">
          {r.encouragement_to_student}
        </p>
      </div>

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

      <div className="no-print mt-10 flex flex-wrap gap-3">
        {onReset && (
          <Button onClick={onReset} variant="outline">
            {resetLabel}
          </Button>
        )}
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / save as PDF
        </Button>
      </div>

      <style>{`
        @media print {
          @page { margin: 0.5in; }
          .no-print { display: none !important; }
          .report-root { padding: 0 !important; max-width: 100% !important; }
          .report-root .shadow-soft,
          .report-root .shadow-lift { box-shadow: none !important; }
          .report-root .rounded-3xl,
          .report-root .rounded-2xl { border-radius: 8px !important; }
          .report-root .bg-gradient-hero { background: #f6f8fb !important; }
          .report-root section,
          .report-root .page-break { break-inside: avoid; }
          .report-root h1, .report-root h2, .report-root h3, .report-root h4 { color: #111 !important; }
          .report-root .text-muted-foreground { color: #444 !important; }
          .report-root a { color: inherit; text-decoration: none; }
        }
      `}</style>
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

function Block({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section className="mt-12 page-break">
      <div className="flex items-center gap-2">
        {icon && <span className="text-primary">{icon}</span>}
        <h2 className="font-display text-3xl font-medium tracking-tight">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
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
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
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
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
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
