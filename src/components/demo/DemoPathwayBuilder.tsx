import { useEffect, useState } from "react";
import { z } from "zod";
import { Link, useRouterState } from "@tanstack/react-router";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SiteShell } from "@/components/site/SiteShell";
import { DEMO_INTAKE } from "@/lib/demo-data";
import {
  PathwayIntakeFormSchema,
  createPathwayIntakeDefaults,
  type PathwayIntakeFormValues,
} from "@/lib/pathway-intake";
import {
  STEPS,
  Stepper,
  ProgressBar,
  StepRole,
  StepAbout,
  StepStrengths,
  StepCareer,
  StepLifeSkills,
  StepPlanningContext,
  StepCurrentGoals,
  StepVoices,
  StepNav,
} from "@/components/pathway/PathwayBuilderSteps";

import {
  PathwayBuilderHeader,
  PATHWAY_FORM_CLASS,
} from "@/components/pathway/PathwayBuilderHeader";

import { DemoInputPlanningDraft } from "./DemoInputPlanningDraft";

const DRAFT_KEY = "tf:demo:pathway-builder:v1";
const DraftSchema = z.object({
  step: z
    .number()
    .int()
    .min(0)
    .max(STEPS.length - 1),
  values: PathwayIntakeFormSchema.extend({
    student_first_name: z.string().max(80),
    submitter_role: z.enum(["family", "educator"]),
  }).omit({ student_id: true }),
});

/** The real builder fields, with fictional local answers and no server calls. */
export function DemoPathwayBuilder() {
  const search = useRouterState({ select: state => state.location.search }) as Record<string, unknown>;
  const requested = search.role;
  const requestedRole = requested === "family" || requested === "educator" ? requested : undefined;
  const [step, setStep] = useState(0);
  const [review, setReview] = useState<PathwayIntakeFormValues | null>(null);
  const [restored, setRestored] = useState(false);
  const form = useForm<PathwayIntakeFormValues>({
    resolver: zodResolver(PathwayIntakeFormSchema),
    defaultValues: {
      ...createPathwayIntakeDefaults(),
      ...DEMO_INTAKE,
      student_id: undefined,
      submitter_role: requestedRole ?? "family",
    },
  });
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      const draft = saved && DraftSchema.safeParse(JSON.parse(saved));
      if (draft && draft.success) {
        form.reset(draft.data.values);
        setStep(draft.data.step);
      }
    } catch {
      // A blocked store or old draft must not prevent using the public demo.
    }
    // An explicit eligible URL perspective wins, without discarding the saved answers or step.
    if (requestedRole) form.setValue("submitter_role", requestedRole);
    setRestored(true);
  }, [form, requestedRole]);
  useEffect(() => {
    if (!restored) return;
    const save = () => {
      try {
        const draft = DraftSchema.safeParse({ step, values: form.getValues() });
        if (draft.success) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft.data));
      } catch {
        // The demo remains usable when browser storage is unavailable.
      }
    };
    save();
    const subscription = form.watch(save);
    return () => subscription.unsubscribe();
  }, [form, restored, step]);
  const role = form.watch("submitter_role");
  async function next() {
    if (step === 1 && !(await form.trigger("student_first_name"))) return;
    setReview(null);
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  }
  return (
    <SiteShell>
      <div className="demo-shell mx-auto w-full max-w-4xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <Link to="/demo" className="text-sm font-medium text-primary hover:underline">
          ← Back to demo
        </Link>
        <PathwayBuilderHeader step={step} role={role} demo />
        <p className="mt-4 text-sm text-foreground/75">
          Try the same questions as the signed-in Pathway Builder with fictional answers. Family and
          educator perspectives are available here; other roles have separate tools.
        </p>
        <div className="pt-8">
          <Stepper
            current={step}
            onJump={(index) => {
              if (index < step) {
                setStep(index);
                setReview(null);
              }
            }}
          />
          <ProgressBar pct={Math.round((step / STEPS.length) * 100)} />
          <FormProvider {...form}>
            <form
              className={PATHWAY_FORM_CLASS}
              onSubmit={form.handleSubmit(setReview)}
              data-testid="demo-pathway-builder"
              noValidate
            >
              {step === 0 && (
                <StepRole
                  role={role}
                  allowedRoles={["family", "educator"]}
                  onPick={(value) => form.setValue("submitter_role", value)}
                />
              )}
              {step === 1 && (
                <StepAbout
                  demo
                  connectedStudents={[]}
                  studentsLoading={false}
                  studentLoadError={false}
                  prefillLoading={false}
                  onStudentChange={() => {}}
                  onExtracted={() => {}}
                />
              )}
              {step === 2 && <StepStrengths />}
              {step === 3 && <StepCareer />}
              {step === 4 && <StepLifeSkills />}
              {step === 5 && <StepPlanningContext />}
              {step === 6 && <StepCurrentGoals role={role} />}
              {step === 7 && <StepVoices role={role} />}
              <StepNav
                demo
                stepIndex={step}
                total={STEPS.length}
                onBack={() => {
                  setStep((value) => Math.max(0, value - 1));
                  setReview(null);
                }}
                onNext={() => void next()}
                submitting={false}
              />
            </form>
          </FormProvider>
        </div>
        {review && <DemoInputPlanningDraft values={review} />}
        {review && (
          <section
            className="mt-5 rounded-2xl border bg-card p-5"
            aria-label="How your inputs inform the report"
            aria-live="polite"
          >
            <h2 className="font-display text-2xl">How these inputs inform the report</h2>
            <p className="mt-4 text-sm">
              Your edits above update the planning draft. The linked report is a separate prepared
              example; it is not generated from these edits.
            </p>
            <Link
              to="/demo/report"
              search={{ example: "builder", role }}
              className="mt-3 inline-block font-semibold text-primary underline"
            >
              Read the sample Pathway Report
            </Link>
          </section>
        )}
      </div>
    </SiteShell>
  );
}
