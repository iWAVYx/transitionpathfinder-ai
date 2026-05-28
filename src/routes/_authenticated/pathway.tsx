import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
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
  needs: z.string().trim().max(2000).optional(),
  supports: z.string().trim().max(2000).optional(),
  transportation: z.string().trim().max(500).optional(),
  communication: z.string().trim().max(500).optional(),
  current_goals: z.string().trim().max(2000).optional(),
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
  { id: "role", label: "Your role" },
  { id: "about", label: "About the student" },
  { id: "strengths", label: "Strengths & interests" },
  { id: "needs", label: "Needs & supports" },
  { id: "voices", label: "Voices & review" },
] as const;

export const Route = createFileRoute("/_authenticated/pathway")({
  head: () => ({
    meta: [{ title: "Create a Pathway Report — TransitionForward" }],
  }),
  component: PathwayPage,
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
      needs: "",
      supports: "",
      transportation: "",
      communication: "",
      current_goals: "",
      family_concerns: "",
      student_voice: "",
      family_voice: "",
      educator_input: "",
    },
  });

  const role = form.watch("submitter_role");

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await generate({ data: values });
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
    // Light validation per step
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
            Pathway Builder · Step {stepIndex + 1} of {STEPS.length}
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

        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-soft sm:p-8"
            noValidate
          >
            {stepIndex === 0 && <StepRole role={role} onPick={(r) => form.setValue("submitter_role", r)} />}
            {stepIndex === 1 && <StepAbout onExtracted={applyExtract} />}
            {stepIndex === 2 && <StepStrengths />}
            {stepIndex === 3 && <StepNeeds />}
            {stepIndex === 4 && <StepVoices role={role} />}

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

/* ---------- Step heads ---------- */

function stepHeading(i: number, role: Role): string {
  if (i === 0) return "Who's filling this out?";
  if (i === 1) return "Tell us a little about the student.";
  if (i === 2) return "What are they good at? What do they love?";
  if (i === 3) return "What helps — and what gets in the way?";
  return role === "student"
    ? "Your voice matters most."
    : "Bring the three voices together.";
}

function stepSubhead(i: number): string {
  if (i === 0) return "Pick the role that fits you best — we'll tune the questions.";
  if (i === 1) return "Just the basics. You can upload an IEP and we'll fill in what we can find.";
  if (i === 2) return "Short bullets are perfect. You don't need to write essays.";
  if (i === 3) return "Tell us what works at home and at school, and what feels hard.";
  return "Share what you can. The more voices included, the more grounded the report.";
}

/* ---------- Stepper ---------- */

function Stepper({ current, onJump }: { current: number; onJump: (i: number) => void }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onJump(i)}
              disabled={i >= current}
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
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="font-medium">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <span className="text-muted-foreground/40">·</span>}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Step 1: Role picker ---------- */

function StepRole({ role, onPick }: { role: Role; onPick: (r: Role) => void }) {
  return (
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
          error={form.formState.errors.student_first_name?.message}
          required
        >
          <Input
            {...form.register("student_first_name")}
            placeholder="First name only"
            autoFocus
          />
        </Field>
        <Field label="Grade band">
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

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Optional · save time
        </p>
        <IepUpload onExtracted={onExtracted} />
      </div>
    </div>
  );
}

/* ---------- Step 3: Strengths ---------- */

function StepStrengths() {
  const form = useFormContext<FormValues>();
  return (
    <div className="space-y-5">
      <Field label="Strengths" hint="What is this student genuinely good at?">
        <Textarea rows={3} {...form.register("strengths")} placeholder="e.g. patient with younger kids, great with their hands, remembers every game stat…" />
      </Field>
      <Field label="Interests" hint="What do they care about, talk about, or light up around?">
        <Textarea rows={3} {...form.register("interests")} placeholder="e.g. cars, cooking, anime, animals, music production…" />
      </Field>
    </div>
  );
}

/* ---------- Step 4: Needs ---------- */

function StepNeeds() {
  const form = useFormContext<FormValues>();
  return (
    <div className="space-y-5">
      <Field label="Disability-related needs" hint="What gets in the way at school or in the world?">
        <Textarea rows={3} {...form.register("needs")} />
      </Field>
      <Field label="Supports that work" hint="Accommodations, routines, people, or tools that help them succeed.">
        <Textarea rows={3} {...form.register("supports")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Transportation">
          <Input {...form.register("transportation")} placeholder="e.g. bus, family drives, learning to drive" />
        </Field>
        <Field label="Communication">
          <Input {...form.register("communication")} placeholder="e.g. verbal, AAC, written, prefers text" />
        </Field>
      </div>
      <Field label="Current IEP transition goals" hint="Paste them in if you have them — even partial is fine.">
        <Textarea rows={3} {...form.register("current_goals")} />
      </Field>
    </div>
  );
}

/* ---------- Step 5: Voices ---------- */

function StepVoices({ role }: { role: Role }) {
  const form = useFormContext<FormValues>();
  const emphasized = useMemo(() => {
    if (role === "student") return "student_voice" as const;
    if (role === "educator") return "educator_input" as const;
    return "family_voice" as const;
  }, [role]);

  const fields: { key: keyof FormValues; label: string; hint: string }[] = [
    {
      key: "student_voice",
      label: "Student's voice",
      hint: "In their words, if possible: what do they want their team to know?",
    },
    {
      key: "family_voice",
      label: "Family voice",
      hint: "Hopes, worries, what's worked at home.",
    },
    {
      key: "educator_input",
      label: "Educator / case manager input",
      hint: "What is the school team seeing? Progress, sticking points, what they'd recommend.",
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
        — fill the others if you can.
      </div>

      {fields.map((f) => (
        <Field
          key={f.key}
          label={f.label + (f.key === emphasized ? " — recommended" : "")}
          hint={f.hint}
        >
          <Textarea rows={3} {...form.register(f.key)} />
        </Field>
      ))}

      <Field label="Family concerns / hopes (optional)" hint="Anything else keeping you up at night, or any specific hope for after high school?">
        <Textarea rows={2} {...form.register("family_concerns")} />
      </Field>
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
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 inline-block">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {hint && <p className="mb-1.5 text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
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
