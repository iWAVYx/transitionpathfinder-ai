import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  HeartHandshake,
  ListChecks,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { IepUpload } from "@/components/pathway/IepUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { IepExtract } from "@/lib/iep-extract.functions";

const STORAGE_KEY = "tf:onboarding";

type Goal = { id: string; text: string };

type OnboardingState = {
  studentFirstName: string;
  iepCaptured: boolean;
  iepNotes: string;
  goals: Goal[];
  completedAt: string | null;
};

const DEFAULT_STATE: OnboardingState = {
  studentFirstName: "",
  iepCaptured: false,
  iepNotes: "",
  goals: [],
  completedAt: null,
};

const GOAL_SUGGESTIONS = [
  "Visit one college or technical program this semester",
  "Practice riding the bus alone, with a check-in call",
  "Open a checking account and learn to read the statement",
  "Draft a one-page resume from volunteer & classroom roles",
  "Cook 3 'forever meals' from start to finish",
  "Write a short self-introduction for the next PPT meeting",
];

const STEPS = [
  { id: "welcome", label: "Welcome", icon: HeartHandshake },
  { id: "iep", label: "Share an IEP", icon: FileText },
  { id: "goals", label: "Set goals", icon: Target },
  { id: "next", label: "Next steps", icon: Sparkles },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — TransitionForward" },
      {
        name: "description",
        content:
          "A friendly 4-step setup: introduce your student, share an IEP, set goals, and see what to do next.",
      },
    ],
  }),
  component: OnboardingPage,
});

function loadState(): OnboardingState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<OnboardingState>) };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: OnboardingState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);

  useEffect(() => {
    setState(loadState());
  }, []);

  const update = (patch: Partial<OnboardingState>) =>
    setState((prev) => {
      const next = { ...prev, ...patch };
      saveState(next);
      return next;
    });

  const stepId: StepId = STEPS[activeIdx].id;
  const progress = Math.round(((activeIdx + 1) / STEPS.length) * 100);

  const canAdvance = useMemo(() => {
    switch (stepId) {
      case "welcome":
        return state.studentFirstName.trim().length > 0;
      case "iep":
        return true; // optional
      case "goals":
        return state.goals.length > 0;
      default:
        return true;
    }
  }, [stepId, state.studentFirstName, state.goals.length]);

  const goNext = () => {
    if (activeIdx < STEPS.length - 1) setActiveIdx(activeIdx + 1);
  };
  const goBack = () => {
    if (activeIdx > 0) setActiveIdx(activeIdx - 1);
  };
  const skip = () => goNext();

  const finish = () => {
    update({ completedAt: new Date().toISOString() });
    toast.success("You're all set. Let's keep going.");
    navigate({ to: "/dashboard" });
  };

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Get started" }]} />
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* Progress strip */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Step {activeIdx + 1} of {STEPS.length} · {STEPS[activeIdx].label}
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="mt-2 h-2" />
          <ol className="mt-4 grid grid-cols-4 gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isDone = i < activeIdx;
              const isActive = i === activeIdx;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => i <= activeIdx && setActiveIdx(i)}
                    disabled={i > activeIdx}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                      isActive && "border-primary bg-primary/5",
                      isDone && "border-transparent bg-muted",
                      !isActive && !isDone && "border-transparent text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        isDone
                          ? "bg-primary text-primary-foreground"
                          : isActive
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <span className="hidden truncate sm:inline">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Step card */}
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          {stepId === "welcome" && <WelcomeStep state={state} update={update} />}
          {stepId === "iep" && <IepStep state={state} update={update} />}
          {stepId === "goals" && <GoalsStep state={state} update={update} />}
          {stepId === "next" && <NextStepsStep state={state} />}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={activeIdx === 0}
              aria-label="Previous step"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <div className="flex flex-wrap gap-2">
              {stepId === "iep" && (
                <Button variant="outline" onClick={skip}>
                  Skip for now
                </Button>
              )}
              {activeIdx < STEPS.length - 1 ? (
                <Button onClick={goNext} disabled={!canAdvance}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={finish}>
                  <Check className="h-4 w-4" /> Finish & go to dashboard
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Your answers are saved on this device. You can leave and come back any time.
        </p>
      </section>
    </SiteShell>
  );
}

/* ---------- Step components ---------- */

function StepHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function WelcomeStep({
  state,
  update,
}: {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        eyebrow="Welcome"
        title="Let's set things up together."
        body="Four short steps. No jargon. You can skip anything that doesn't fit and edit your answers later."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { icon: FileText, label: "Share an IEP", note: "Optional — we'll read it for you" },
          { icon: Target, label: "Set 1–3 goals", note: "Tiny is fine. We'll grow from there" },
          { icon: ListChecks, label: "See next steps", note: "In plain language, not jargon" },
          { icon: HeartHandshake, label: "Stay in charge", note: "Nothing is shared without you" },
        ].map(({ icon: Icon, label, note }) => (
          <div key={label} className="flex items-start gap-3 rounded-2xl bg-muted/60 p-4">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{note}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="student-first-name">What's the student's first name?</Label>
        <Input
          id="student-first-name"
          autoFocus
          maxLength={80}
          value={state.studentFirstName}
          onChange={(e) => update({ studentFirstName: e.target.value })}
          placeholder="e.g. Alex"
        />
        <p className="text-xs text-muted-foreground">
          We'll use this name throughout — first name is plenty.
        </p>
      </div>
    </div>
  );
}

function IepStep({
  state,
  update,
}: {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}) {
  const onExtracted = (extract: IepExtract) => {
    update({
      iepCaptured: true,
      iepNotes: [extract.strengths, extract.needs, extract.current_goals]
        .filter((s) => s && s.trim().length > 0)
        .join("\n\n"),
      studentFirstName: state.studentFirstName || extract.student_first_name || "",
    });
  };

  return (
    <div className="space-y-6">
      <StepHeader
        eyebrow="Share an IEP"
        title="Have a recent IEP? Drop it in."
        body="We'll read it quietly and pull out the parts that matter — strengths, supports, current goals. You can skip this step and add it later if it's not handy."
      />

      <IepUpload onExtracted={onExtracted} />

      {state.iepCaptured && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Check className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">We've got the IEP in hand.</p>
              <p className="text-xs text-muted-foreground">
                The key pieces will be available the next time you create a Pathway Report.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalsStep({
  state,
  update,
}: {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}) {
  const [draft, setDraft] = useState("");
  const goals = state.goals;

  const addGoal = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (goals.length >= 5) {
      toast.message("Keep it short — five is plenty for now.");
      return;
    }
    if (goals.some((g) => g.text.toLowerCase() === trimmed.toLowerCase())) {
      toast.message("That one's already on the list.");
      return;
    }
    update({
      goals: [...goals, { id: crypto.randomUUID(), text: trimmed.slice(0, 200) }],
    });
    setDraft("");
  };

  const removeGoal = (id: string) =>
    update({ goals: goals.filter((g) => g.id !== id) });

  return (
    <div className="space-y-6">
      <StepHeader
        eyebrow="Set goals"
        title={`Pick 1–3 small goals for ${state.studentFirstName || "the student"}.`}
        body="More than three and nothing moves. Pull them from the IEP, the family conversation, or this list of starters."
      />

      <div className="space-y-2">
        <Label htmlFor="goal-input">Add a goal</Label>
        <div className="flex gap-2">
          <Input
            id="goal-input"
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addGoal(draft);
              }
            }}
            placeholder="e.g. Visit a community college campus"
          />
          <Button onClick={() => addGoal(draft)} disabled={!draft.trim()}>
            Add
          </Button>
        </div>
      </div>

      {goals.length > 0 && (
        <ul className="space-y-2">
          {goals.map((g, i) => (
            <li
              key={g.id}
              className="flex items-start gap-3 rounded-2xl border bg-background p-3"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <p className="flex-1 text-sm leading-relaxed">{g.text}</p>
              <button
                type="button"
                onClick={() => removeGoal(g.id)}
                aria-label={`Remove goal: ${g.text}`}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Need ideas?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {GOAL_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addGoal(s)}
              className="rounded-full border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NextStepsStep({ state }: { state: OnboardingState }) {
  const name = state.studentFirstName || "the student";

  return (
    <div className="space-y-6">
      <StepHeader
        eyebrow="Next steps"
        title={`Nice work. Here's where to go next for ${name}.`}
        body="Three small moves you can make this week. None of them take longer than 20 minutes."
      />

      <ol className="space-y-3">
        <NextCard
          number={1}
          title="Generate a full Pathway Report"
          body="We'll turn what you've shared into a warm, plain-language plan with career, education, and life-skills suggestions."
          to="/pathway"
          cta="Open the report builder"
        />
        <NextCard
          number={2}
          title="Track your goals over time"
          body={`Your ${state.goals.length || "first few"} goal${state.goals.length === 1 ? "" : "s"} will show up in the Goal Tracker so you can move them from "not started" to "met" at your pace.`}
          to="/goals"
          cta="Open Goal Tracker"
        />
        <NextCard
          number={3}
          title="Prep the next PPT meeting"
          body="Bring talking points, questions, and a printable handout so the whole team is on the same page."
          to="/ppt-prep"
          cta="Open PPT Prep"
        />
      </ol>

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <p className="text-sm font-semibold">A small reminder</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Progress is rarely a straight line. Celebrate the small wins out loud — they're the
          ones that build momentum.
        </p>
      </div>
    </div>
  );
}

function NextCard({
  number,
  title,
  body,
  to,
  cta,
}: {
  number: number;
  title: string;
  body: string;
  to: "/pathway" | "/goals" | "/ppt-prep";
  cta: string;
}) {
  return (
    <li className="rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-medium">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
          <div className="mt-3">
            <Button asChild size="sm" variant="outline">
              <Link to={to}>
                {cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
