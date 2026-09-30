import { useEffect, useState } from "react";
import { z } from "zod";
import { Link } from "@tanstack/react-router";
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
  stepHeading,
  stepSubhead,
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
  const [step, setStep] = useState(0);
  const [review, setReview] = useState<PathwayIntakeFormValues | null>(null);
  const [restored, setRestored] = useState(false);
  const form = useForm<PathwayIntakeFormValues>({
    resolver: zodResolver(PathwayIntakeFormSchema),
    defaultValues: {
      ...createPathwayIntakeDefaults(),
      ...DEMO_INTAKE,
      student_id: undefined,
      submitter_role: "family",
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
    setRestored(true);
  }, [form]);
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
      <div className="demo-shell mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <Link to="/demo" className="text-sm font-medium text-primary hover:underline">
          ← Back to demo
        </Link>
        <header className="my-5 rounded-2xl border bg-card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Pathway Builder · Sample only · Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="mt-2 font-display text-3xl">{stepHeading(step, role)}</h1>
          <p className="mt-2 text-sm text-foreground/75">{stepSubhead(step, true)}</p>
          <p className="mt-3 text-sm text-foreground/75">
            Try the same questions as the signed-in Pathway Builder with fictional answers. Family
            and educator perspectives are available here; other roles have separate tools.
          </p>
        </header>
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
            className="mt-5 rounded-2xl border bg-card p-4 sm:p-6"
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
        {review && (
          <section
            className="mt-5 rounded-2xl border bg-card p-5"
            aria-label="How your inputs inform the report"
            aria-live="polite"
          >
            <h2 className="font-display text-2xl">How these inputs inform the report</h2>
            <dl className="mt-4 space-y-4 text-sm">
              {[
                [
                  "Strengths and interests → pathway exploration",
                  [review.strengths, review.interests].filter(Boolean).join(" · "),
                ],
                [
                  "Goals → education, work and daily-life planning",
                  [
                    review.career_goals,
                    review.education_goals,
                    review.desired_postsecondary_outcomes,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                ],
                [
                  "Supports → feasibility and accommodations",
                  [
                    review.supports,
                    review.assistive_technology,
                    review.accommodations,
                    review.transportation_needs,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                ],
                [
                  "Evidence and uncertainty → team review",
                  [
                    review.readiness_evidence,
                    review.evidence_source_dates,
                    review.information_to_verify,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-semibold">{label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-foreground/75">
                    {value || "Not added yet — the team would need more information."}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm">
              Your edits above update this input review. The report below is a separate prepared
              example; it is not generated from these edits.
            </p>
            <Link
              to="/demo/report"
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
