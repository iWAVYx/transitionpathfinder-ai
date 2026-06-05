import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Users,
  GraduationCap,
  User,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  ShieldCheck,
  Loader2,
  HelpCircle,
  Lightbulb,
  Briefcase,
  BookOpen,
  Home as HomeIcon,
  Heart,
  ClipboardList,
  MessageCircle,
  FileText,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { InfoBox } from "@/components/site/InfoBox";
import { Term, GLOSSARY } from "@/components/site/Term";
import { IepUpload } from "@/components/pathway/IepUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { createPathwayReport } from "@/lib/pathway.functions";
import type { IepExtract } from "@/lib/iep-extract.functions";
import pathwayHero from "@/assets/pathway-hero.jpg";

const Schema = z.object({
  submitter_role: z.enum(["family", "student", "educator"]),
  student_first_name: z.string().trim().min(1, "Please add a first name to continue.").max(80),
  grade_band: z.enum(["9-10", "11-12", "post-secondary", "not-applicable"]).optional(),
  strengths: z.string().trim().max(2000).optional(),
  interests: z.string().trim().max(2000).optional(),
  career_goals: z.string().trim().max(2000).optional(),
  education_goals: z.string().trim().max(2000).optional(),
  needs: z.string().trim().max(2000).optional(),
  life_skills: z.string().trim().max(2000).optional(),
  supports: z.string().trim().max(2000).optional(),
  transportation: z.string().trim().max(500).optional(),
  communication: z.string().trim().max(500).optional(),
  current_goals: z.string().trim().max(2000).optional(),
  teacher_observations: z.string().trim().max(2000).optional(),
  family_concerns: z.string().trim().max(2000).optional(),
  student_voice: z.string().trim().max(2000).optional(),
  family_voice: z.string().trim().max(2000).optional(),
  educator_input: z.string().trim().max(2000).optional(),
});
type FormValues = z.infer<typeof Schema>;
type Role = FormValues["submitter_role"];

const ROLE_META: Record<Role, { title: string; subtitle: string; icon: typeof Users }> = {
  family: {
    title: "I'm a parent or caregiver",
    subtitle: "Build a plan for your student and bring it to the next PPT meeting.",
    icon: Users,
  },
  student: {
    title: "I'm the student",
    subtitle: "Tell us about you. We'll help map out what comes after high school.",
    icon: User,
  },
  educator: {
    title: "I'm an educator or case manager",
    subtitle: "Create a PPT-ready snapshot grounded in the student's voice.",
    icon: GraduationCap,
  },
};

const STEPS = [
  { id: "role", label: "Your role", icon: Users },
  { id: "about", label: "About the student", icon: User },
  { id: "strengths", label: "Strengths & interests", icon: Lightbulb },
  { id: "career", label: "Career & education goals", icon: Briefcase },
  { id: "life", label: "Life skills & supports", icon: HomeIcon },
  { id: "current", label: "Current goals & observations", icon: ClipboardList },
  { id: "voices", label: "Voices & review", icon: MessageCircle },
] as const;

export const Route = createFileRoute("/_authenticated/pathway")({
  head: () => ({
    meta: [{ title: "Create a Pathway Report — TransitionForward" }],
  }),
  component: () => (<RoleGuard path="/pathway"><PathwayPage /></RoleGuard>),
});

function PathwayPage() {
  const generate = useServerFn(createPathwayReport);
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    mode: "onSubmit",
    defaultValues: {
      submitter_role: "family",
      student_first_name: "",
      grade_band: undefined,
      strengths: "",
      interests: "",
      career_goals: "",
      education_goals: "",
      needs: "",
      life_skills: "",
      supports: "",
      transportation: "",
      communication: "",
      current_goals: "",
      teacher_observations: "",
      family_concerns: "",
      student_voice: "",
      family_voice: "",
      educator_input: "",
    },
  });

  const role = form.watch("submitter_role");

  const onSubmit = async (values: FormValues) => {
    try {
      // Merge new structured sections into existing backend fields so they
      // reach the AI without requiring a DB schema change.
      const merged = mergeIntake(values);
      const res = await generate({ data: merged });
      navigate({
        to: "/reports/$reportId",
        params: { reportId: res.reportId },
        search: { welcome: 1 } as never,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const applyExtract = (e: IepExtract) => {
    const fields: (keyof FormValues)[] = [
      "student_first_name", "strengths", "interests", "needs", "supports",
      "transportation", "communication", "current_goals", "family_concerns",
      "student_voice", "educator_input",
    ];
    for (const k of fields) {
      const v = (e as Record<string, string>)[k];
      if (v && v.trim()) form.setValue(k, v, { shouldDirty: true, shouldValidate: false });
    }
    if (e.grade_band) {
      form.setValue("grade_band", e.grade_band as FormValues["grade_band"]);
    }
    toast.success("Filled in what we could find. Review and edit anything.");
  };

  async function goNext() {
    if (stepIndex === 1) {
      const ok = await form.trigger("student_first_name");
      if (!ok) return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Match the rule used by onboarding + roadmap: count only steps the user
  // has finished and moved past, so step 1 of N starts at 0% instead of 1/N.
  const progressPct = Math.round((stepIndex / STEPS.length) * 100);

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-80" />
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 md:block">
          <img
            src={pathwayHero}
            alt=""
            aria-hidden
            width={1600}
            height={900}
            className="h-full w-full object-cover opacity-90 [mask-image:linear-gradient(to_right,transparent,black_35%)]"
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <Breadcrumbs trail={[{ label: "Pathway Builder" }]} />
        </div>
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Pathway Builder · Step {stepIndex + 1} of {STEPS.length} · {progressPct}% complete
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            {stepHeading(stepIndex, role)}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {stepSubhead(stepIndex)}{" "}
            <Link to="/reports" className="font-semibold text-foreground hover:underline">
              See your saved reports →
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 lg:px-8">
        <Stepper current={stepIndex} onJump={(i) => i < stepIndex && setStepIndex(i)} />
        <ProgressBar pct={progressPct} />

        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-soft sm:p-8"
            noValidate
          >
            {stepIndex === 0 && <StepRole role={role} onPick={(r) => form.setValue("submitter_role", r)} />}
            {stepIndex === 1 && <StepAbout onExtracted={applyExtract} />}
            {stepIndex === 2 && <StepStrengths />}
            {stepIndex === 3 && <StepCareer />}
            {stepIndex === 4 && <StepLifeSkills />}
            {stepIndex === 5 && <StepCurrentGoals role={role} />}
            {stepIndex === 6 && <StepVoices role={role} />}

            <StepNav
              stepIndex={stepIndex}
              total={STEPS.length}
              onBack={goBack}
              onNext={goNext}
              submitting={form.formState.isSubmitting}
            />
          </form>
        </FormProvider>

        <TrustRow />
      </section>
    </SiteShell>
  );
}

/* ---------- Merge helper ---------- */

function mergeIntake(v: FormValues) {
  const join = (label: string, val?: string) =>
    val && val.trim() ? `${label}: ${val.trim()}` : "";

  const current_goals = [
    v.current_goals?.trim() || "",
    join("Career goals", v.career_goals),
    join("Education / training goals", v.education_goals),
  ].filter(Boolean).join("\n\n");

  const needs = [
    v.needs?.trim() || "",
    join("Life-skills needs", v.life_skills),
  ].filter(Boolean).join("\n\n");

  const educator_input = [
    v.educator_input?.trim() || "",
    join("Teacher observations", v.teacher_observations),
  ].filter(Boolean).join("\n\n");

  return {
    submitter_role: v.submitter_role,
    student_first_name: v.student_first_name,
    grade_band: v.grade_band,
    strengths: v.strengths,
    interests: v.interests,
    needs,
    supports: v.supports,
    transportation: v.transportation,
    communication: v.communication,
    current_goals,
    family_concerns: v.family_concerns,
    student_voice: v.student_voice,
    family_voice: v.family_voice,
    educator_input,
  };
}

/* ---------- Step heads ---------- */

function stepHeading(i: number, role: Role): string {
  if (i === 0) return "Who's filling this out?";
  if (i === 1) return "Tell us a little about the student.";
  if (i === 2) return "What are they good at? What do they love?";
  if (i === 3) return "What do they want their life to look like?";
  if (i === 4) return "What helps day-to-day — and what's still being learned?";
  if (i === 5) return "Where are things today?";
  return role === "student"
    ? "Your voice matters most."
    : "Bring the three voices together.";
}

function stepSubhead(i: number): string {
  if (i === 0) return "Pick the role that fits you best — we'll tune the questions for you.";
  if (i === 1) return "Just the basics. You can upload an IEP or evaluation and we'll fill in what we can find.";
  if (i === 2) return "Short bullets are perfect. You don't need to write essays.";
  if (i === 3) return "Dreams count. So do small, practical next steps. Both belong here.";
  if (i === 4) return "Things like cooking, money, transportation, friendships, self-advocacy.";
  if (i === 5) return "Current IEP transition goals, what the team is seeing, and anything weighing on the family.";
  return "Share what you can. The more voices included, the more grounded the report.";
}

/* ---------- Stepper ---------- */

function Stepper({ current, onJump }: { current: number; onJump: (i: number) => void }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = s.icon;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onJump(i)}
              disabled={i >= current}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors",
                active && "border-primary bg-primary text-primary-foreground",
                done && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer",
                !active && !done && "border-border bg-background text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  active && "bg-primary-foreground/20",
                  done && "bg-primary/15",
                  !active && !done && "bg-muted",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
              </span>
              <span className="font-medium">{s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div
      className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Intake progress"
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ---------- Step 1: Role picker ---------- */

function StepRole({ role, onPick }: { role: Role; onPick: (r: Role) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(ROLE_META) as Role[]).map((r) => {
          const meta = ROLE_META[r];
          const Icon = meta.icon;
          const active = role === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onPick(r)}
              className={cn(
                "group flex h-full flex-col gap-3 rounded-2xl border bg-background p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft",
                active
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border/60 hover:border-primary/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {active && <Check className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <p className="font-display text-lg leading-snug">{meta.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{meta.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        Don't worry — you'll be able to add the other voices later. Picking your role just
        helps us reorder the questions so the most important ones come first for you.
      </p>
    </div>
  );
}

/* ---------- Step 2: About ---------- */

function StepAbout({ onExtracted }: { onExtracted: (e: IepExtract) => void }) {
  const form = useFormContext<FormValues>();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Student's first name"
          hint="We only use the first name in the report — never a last name."
          why="A name makes the report read like a story about a real student, not a generic template."
          error={form.formState.errors.student_first_name?.message}
          required
        >
          <Input
            {...form.register("student_first_name")}
            placeholder="First name only"
            autoFocus
          />
        </Field>
        <Field
          label="Grade band"
          hint="Roughly where they are in school today."
          why="Different ages call for different next steps. A 9th grader explores; an 18-year-old is choosing."
        >
          <Select
            value={form.watch("grade_band") ?? ""}
            onValueChange={(v) => form.setValue("grade_band", v as FormValues["grade_band"])}
          >
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="9-10">9th – 10th</SelectItem>
              <SelectItem value="11-12">11th – 12th</SelectItem>
              <SelectItem value="post-secondary">Post-secondary (18–21)</SelectItem>
              <SelectItem value="not-applicable">Not applicable</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <InfoBox label="New to this? What's an IEP and a PPT?">
        <p>
          An <strong>IEP</strong> (Individualized Education Program) is the legal plan that spells
          out your student's goals, services, and supports.
        </p>
        <p className="mt-2">
          A <strong>PPT</strong> (<Term definition={GLOSSARY.PPT}>Planning &amp; Placement Team</Term>)
          meeting is where families and school staff review that plan together.
        </p>
      </InfoBox>

      <div className="rounded-2xl border border-border/60 bg-background p-5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Optional · upload documents
          </p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Have an IEP, evaluation, or transition assessment? Upload it and we'll pre-fill the
          questions below. You can review and edit everything before generating the report.
        </p>
        <div className="mt-3">
          <IepUpload onExtracted={onExtracted} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Step 3: Strengths & interests ---------- */

function StepStrengths() {
  const form = useFormContext<FormValues>();
  return (
    <div className="space-y-5">
      <Field
        label="Strengths"
        icon={Lightbulb}
        hint="What is this student genuinely good at? Skills, qualities, the things people notice."
        why="Every pathway we recommend has to tie back to a real strength. This is the most important box on this page."
        examples={[
          "Patient and gentle with younger kids",
          "Great with their hands — can fix almost anything",
          "Remembers every stat from every game",
          "Always the first to welcome a new student",
        ]}
      >
        <Textarea
          rows={3}
          {...form.register("strengths")}
          placeholder="Short bullets are perfect — one per line."
        />
      </Field>
      <Field
        label="Interests"
        icon={Heart}
        hint="What do they care about, talk about, or light up around?"
        why="Interests are the engine. We use them to suggest real-world careers, classes, and community connections."
        examples={[
          "Cars and engines",
          "Cooking — especially baking",
          "Anime and drawing",
          "Animals, especially dogs",
          "Music production / making beats",
        ]}
      >
        <Textarea rows={3} {...form.register("interests")} placeholder="e.g. cars, cooking, anime, animals, music production…" />
      </Field>
    </div>
  );
}

/* ---------- Step 4: Career & education goals ---------- */

function StepCareer() {
  const form = useFormContext<FormValues>();
  return (
    <div className="space-y-5">
      <Field
        label="Career goals"
        icon={Briefcase}
        hint="What kind of work does the student dream about — or what work feels realistic right now?"
        why="The IEP requires a measurable post-secondary employment goal. Your words here become the starting draft."
        examples={[
          "Work with animals — maybe a vet tech assistant",
          "Help kids — daycare, after-school programs",
          "Hands-on trade — auto, HVAC, or construction",
          "Not sure yet — wants to try a few things first",
        ]}
      >
        <Textarea
          rows={3}
          {...form.register("career_goals")}
          placeholder="Dreams, leanings, and 'I'd like to try…' all belong here."
        />
      </Field>

      <Field
        label="Education or training goals"
        icon={BookOpen}
        hint="After high school — college, certificate program, technical school, on-the-job training, or something else?"
        why="Post-secondary education is the second required IEP goal area. Even 'not college' is a valid, plannable choice."
        examples={[
          "Community college — culinary certificate",
          "CT technical high school program",
          "Job coaching + paid work experience",
          "Two-year transition program (18–21)",
        ]}
      >
        <Textarea
          rows={3}
          {...form.register("education_goals")}
          placeholder="Programs, certificates, classes, or hands-on learning paths."
        />
      </Field>
    </div>
  );
}

/* ---------- Step 5: Life skills & supports ---------- */

function StepLifeSkills() {
  const form = useFormContext<FormValues>();
  return (
    <div className="space-y-5">
      <Field
        label="Disability-related needs"
        hint="What gets in the way at school or in the world?"
        why="Naming the barriers helps us suggest the right accommodations and supports — not generic ones."
      >
        <Textarea
          rows={3}
          {...form.register("needs")}
          placeholder="e.g. needs extra time on tests, sensory overwhelm in crowds, hard time starting tasks…"
        />
      </Field>

      <Field
        label="Life-skills areas to grow"
        icon={HomeIcon}
        hint="Independent-living skills the student is working on or wants to learn."
        why="The IEP requires an 'independent living' goal when appropriate. Real skills > vague language."
        examples={[
          "Cooking simple meals",
          "Using a debit card and a budget",
          "Riding the bus alone",
          "Scheduling and getting to appointments",
          "Doing laundry start to finish",
        ]}
      >
        <Textarea
          rows={3}
          {...form.register("life_skills")}
          placeholder="One skill per line is great."
        />
      </Field>

      <Field
        label="Supports that work"
        hint="Accommodations, routines, people, or tools that help them succeed."
        why="What's already working is gold. We'll carry it forward into the recommendations."
      >
        <Textarea
          rows={3}
          {...form.register("supports")}
          placeholder="e.g. visual schedule, noise-cancelling headphones, weekly check-in with Ms. Lopez…"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Transportation"
          hint="How they get around today and what they're working toward."
          why="Transportation is one of the most common barriers to adult life. Naming it early matters."
        >
          <Input {...form.register("transportation")} placeholder="e.g. bus, family drives, learning to drive" />
        </Field>
        <Field
          label="Communication"
          hint="How they communicate best."
          why="Helps every adult on the team meet the student where they are."
        >
          <Input {...form.register("communication")} placeholder="e.g. verbal, AAC, written, prefers text" />
        </Field>
      </div>
    </div>
  );
}

/* ---------- Step 6: Current goals + observations ---------- */

function StepCurrentGoals({ role }: { role: Role }) {
  const form = useFormContext<FormValues>();
  return (
    <div className="space-y-5">
      <Field
        label="Current transition goals (from the IEP)"
        icon={ClipboardList}
        hint="Paste them in if you have them — even partial wording is fine."
        why="If we have the current goals, the report can rewrite them in plain English and suggest where to sharpen them."
      >
        <Textarea
          rows={3}
          {...form.register("current_goals")}
          placeholder="It's okay to copy/paste right from the IEP."
        />
      </Field>

      <Field
        label={role === "educator" ? "Your observations" : "Educator / case-manager observations"}
        hint="What is the school team noticing — progress, sticking points, what's clicking?"
        why="Educator observations are weighted heavily by the report. Specific examples beat ratings."
        examples={[
          "Doing great in cooking class — leading prep most days",
          "Still freezes when asked to make a phone call",
          "Loves the new peer-mentor — first friend at lunch",
        ]}
      >
        <Textarea
          rows={3}
          {...form.register("teacher_observations")}
          placeholder="One observation per line is perfect."
        />
      </Field>

      <Field
        label="Family concerns or hopes"
        hint="What's keeping you up at night? What do you most hope for after high school?"
        why="Concerns and hopes shape the family-action-plan section of the report."
      >
        <Textarea
          rows={3}
          {...form.register("family_concerns")}
          placeholder="It's okay to write this like a letter."
        />
      </Field>
    </div>
  );
}

/* ---------- Step 7: Voices ---------- */

function StepVoices({ role }: { role: Role }) {
  const form = useFormContext<FormValues>();
  const emphasized = useMemo(() => {
    if (role === "student") return "student_voice" as const;
    if (role === "educator") return "educator_input" as const;
    return "family_voice" as const;
  }, [role]);

  const fields: { key: keyof FormValues; label: string; hint: string; why: string }[] = [
    {
      key: "student_voice",
      label: "Student's voice",
      hint: "In their words, if possible: what do they want their team to know?",
      why: "Student voice anchors the whole report. Even one sentence in their own words changes the tone.",
    },
    {
      key: "family_voice",
      label: "Family voice",
      hint: "Hopes, worries, what's worked at home.",
      why: "Families see things school never sees. This section makes the picture whole.",
    },
    {
      key: "educator_input",
      label: "Educator / case-manager input",
      hint: "What is the school team seeing? Progress, sticking points, what they'd recommend.",
      why: "Closes the loop between home and school so the PPT starts with shared facts.",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground/80">
        Your voice matters most here.{" "}
        <strong>
          {emphasized === "student_voice"
            ? "Start with the student's voice"
            : emphasized === "educator_input"
              ? "Start with your educator notes"
              : "Start with the family voice"}
        </strong>{" "}
        — fill the others if you can. You can always come back and add more later.
      </div>

      {fields.map((f) => (
        <Field
          key={f.key}
          label={f.label + (f.key === emphasized ? " — recommended" : "")}
          hint={f.hint}
          why={f.why}
        >
          <Textarea rows={3} {...form.register(f.key)} />
        </Field>
      ))}
    </div>
  );
}

/* ---------- Step nav ---------- */

function StepNav({
  stepIndex,
  total,
  onBack,
  onNext,
  submitting,
}: {
  stepIndex: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  submitting: boolean;
}) {
  const isLast = stepIndex === total - 1;
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        disabled={stepIndex === 0 || submitting}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {isLast ? (
        <div className="flex flex-col items-end gap-2">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating your Pathway Report…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Pathway Report
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Usually takes 15–30 seconds. You can edit and re-run anytime.
          </p>
        </div>
      ) : (
        <Button type="button" onClick={onNext} disabled={submitting}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/* ---------- Field helper ---------- */

function Field({
  label,
  hint,
  why,
  examples,
  icon: Icon,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  why?: string;
  examples?: string[];
  icon?: typeof Lightbulb;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        {Icon && (
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <Label className="inline-block">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        {why && <WhyThisMatters text={why} />}
      </div>
      {hint && <p className="mb-1.5 text-xs text-muted-foreground">{hint}</p>}
      {children}
      {examples && examples.length > 0 && (
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none font-medium text-foreground/70 hover:text-foreground">
            Need examples?
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {examples.map((ex) => (
              <li key={ex}>{ex}</li>
            ))}
          </ul>
        </details>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function WhyThisMatters({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          aria-label="Why this matters"
        >
          <HelpCircle className="h-3 w-3" />
          Why this matters
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-xs text-sm leading-relaxed">
        {text}
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Trust row ---------- */

function TrustRow() {
  return (
    <div className="mt-8 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
      <div className="flex items-start gap-2 rounded-2xl border border-border/60 bg-background p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
        <p>Your intake stays private to your account. You decide who to share with.</p>
      </div>
      <div className="flex items-start gap-2 rounded-2xl border border-border/60 bg-background p-4">
        <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
        <p>AI drafts the report — you stay in charge of every decision.</p>
      </div>
      <div className="flex items-start gap-2 rounded-2xl border border-border/60 bg-background p-4">
        <Check className="mt-0.5 h-4 w-4 text-primary" />
        <p>Save, print to PDF, and share secure links with family or your PPT team.</p>
      </div>
    </div>
  );
}
