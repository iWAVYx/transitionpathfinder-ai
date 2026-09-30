import { STEPS, stepHeading, stepSubhead, Stepper, ProgressBar, StepRole, StepAbout, StepStrengths, StepCareer, StepLifeSkills, StepPlanningContext, StepCurrentGoals, StepVoices, StepNav, TrustRow } from "@/components/pathway/PathwayBuilderSteps";
import { getMyRoles } from "@/lib/profile.functions";
import { audiencesForRoles } from "@/lib/role-policy";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  MapPinned,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getDashboardSnapshot } from "@/lib/golden-path.functions";
import { createPathwayReport } from "@/lib/pathway.functions";
import {
  PathwayIntakeFormSchema,
  buildPathwayStudentPrefill,
  createPathwayIntakeDefaults,
  mergePathwayIntake,
  type PathwayIntakeFormValues as FormValues,
  type PathwayIntakeRole as Role,
} from "@/lib/pathway-intake";
import type { IepExtract } from "@/lib/iep-extract.functions";
import { listStudents, type Student } from "@/lib/students.functions";
import pathwayHero from "@/assets/pathway-hero.jpg";

export const Route = createFileRoute("/_authenticated/pathway")({
  head: () => ({
    meta: [{ title: "Create a Pathway Report — TransitionForward" }],
  }),
  component: () => (
    <RoleGuard path="/pathway">
      <PathwayPage />
    </RoleGuard>
  ),
});

function PathwayPage() {
  const generate = useServerFn(createPathwayReport);
  const loadRoles = useServerFn(getMyRoles);
  const [allowedRoles, setAllowedRoles] = useState<Role[]>([]);
  const loadStudents = useServerFn(listStudents);
  const loadSnapshot = useServerFn(getDashboardSnapshot);
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [connectedStudents, setConnectedStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentLoadError, setStudentLoadError] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const studentRequestRef = useRef(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(PathwayIntakeFormSchema),
    mode: "onSubmit",
    defaultValues: createPathwayIntakeDefaults(),
  });

  const role = form.watch("submitter_role");
  const connectedStudentId = form.watch("student_id");

  const connectStudent = useCallback(
    async (studentId: string, announce = true) => {
      const currentRole = form.getValues("submitter_role");
      const requestId = ++studentRequestRef.current;

      // Clear every prior answer before the new profile request begins. This
      // closes the loading window in which one student's draft could otherwise
      // be submitted while a different student id was already selected.
      form.reset({
        ...createPathwayIntakeDefaults(),
        submitter_role: currentRole,
        student_id: studentId,
      });
      setPrefillLoading(true);
      try {
        const snapshot = await loadSnapshot({ data: { student_id: studentId } });
        if (studentRequestRef.current !== requestId) return;
        const prefill = buildPathwayStudentPrefill(snapshot);
        if (!prefill) throw new Error("This student profile is not available.");

        form.reset({
          ...createPathwayIntakeDefaults(),
          submitter_role: currentRole,
          ...prefill,
        });
        if (announce) {
          toast.success("Connected the student and loaded their current profile for review.");
        }
      } catch (error) {
        if (studentRequestRef.current === requestId) {
          form.setValue("student_id", undefined);
          toast.error(error instanceof Error ? error.message : "Could not connect this student.");
        }
      } finally {
        if (studentRequestRef.current === requestId) {
          setPrefillLoading(false);
        }
      }
    },
    [form, loadSnapshot],
  );

  useEffect(() => {
    let active = true;
    Promise.all([loadStudents(), loadRoles()])
      .then(([result, membership]) => {
        if (!active) return;
        const audiences = audiencesForRoles(membership.roles);
        const available = (["family", "educator"] as Role[]).filter(role => audiences.has(role === "family" ? "family" : "educator"));
        setAllowedRoles(available);
        if (available.length && !available.includes(form.getValues("submitter_role"))) form.setValue("submitter_role", available[0]);
        setConnectedStudents(result.students);
        if (result.students.length === 1) {
          void connectStudent(result.students[0].id, false);
        }
      })
      .catch(() => {
        if (active) setStudentLoadError(true);
      })
      .finally(() => {
        if (active) setStudentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [connectStudent, loadStudents, loadRoles, form]);

  const onSubmit = async (values: FormValues) => {
    if (!allowedRoles.includes(values.submitter_role)) {
      toast.error("Choose a role available to your signed-in account.");
      return;
    }
    if (studentLoadError) {
      toast.error("Student access could not be verified. Refresh before generating a report.");
      return;
    }
    if (connectedStudents.length > 0 && !values.student_id) {
      setStepIndex(1);
      toast.error("Choose the connected student this report belongs to.");
      return;
    }
    try {
      // Merge new structured sections into existing backend fields so they
      // reach the AI without requiring a DB schema change.
      const merged = mergePathwayIntake(values);
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
      "student_first_name",
      "strengths",
      "interests",
      "needs",
      "supports",
      "transportation",
      "communication",
      "current_goals",
      "family_concerns",
      "student_voice",
      "educator_input",
      "assistive_technology",
      "accommodations",
      "services_received",
      "readiness_evidence",
      "evidence_source_dates",
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
    if (stepIndex === 0 && !allowedRoles.includes(role)) {
      toast.info("An eligible family or educator role is required to use the builder.");
      return;
    }
    if (stepIndex === 1) {
      if (studentsLoading || prefillLoading) {
        toast.info("Please wait while the connected student is loaded.");
        return;
      }
      if (studentLoadError) {
        toast.error("Student access could not be verified. Refresh to try again.");
        return;
      }
      if (connectedStudents.length > 0 && !form.getValues("student_id")) {
        toast.error("Choose the connected student this report belongs to.");
        return;
      }
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
      <div className="demo-shell">
        <section className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 lg:px-8">
          <Breadcrumbs trail={[{ label: "Pathway Builder" }]} />
          <div className="tf-cover relative mt-5 overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
            <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
              <img
                src={pathwayHero}
                alt=""
                aria-hidden
                width={1600}
                height={900}
                className="h-full w-full object-cover opacity-70 [mask-image:linear-gradient(to_right,transparent,black_45%)]"
              />
            </div>
            <div className="relative">
              <p className="tf-eyebrow">
                Pathway Builder · Step {stepIndex + 1} of {STEPS.length} · {progressPct}% Complete
              </p>
              <h1 className="mt-4 max-w-2xl font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
                {stepHeading(stepIndex, role)}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {stepSubhead(stepIndex)}{" "}
                <Link to="/reports" className="font-semibold text-foreground hover:underline">
                  See your saved reports →
                </Link>
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          <Stepper current={stepIndex} onJump={(i) => i < stepIndex && setStepIndex(i)} />
          <ProgressBar pct={progressPct} />

          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              data-testid="pathway-intake-form"
              data-pathway-step={STEPS[stepIndex].id}
              className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-soft sm:p-8"
              noValidate
            >
              {stepIndex === 0 && (
                <StepRole allowedRoles={allowedRoles} role={role} onPick={(r) => form.setValue("submitter_role", r)} />
              )}
              {stepIndex === 1 && (
                <StepAbout
                  connectedStudents={connectedStudents}
                  connectedStudentId={connectedStudentId}
                  studentsLoading={studentsLoading}
                  studentLoadError={studentLoadError}
                  prefillLoading={prefillLoading}
                  onStudentChange={(studentId) => void connectStudent(studentId)}
                  onExtracted={applyExtract}
                />
              )}
              {stepIndex === 2 && <StepStrengths />}
              {stepIndex === 3 && <StepCareer />}
              {stepIndex === 4 && <StepLifeSkills />}
              {stepIndex === 5 && <StepPlanningContext />}
              {stepIndex === 6 && <StepCurrentGoals role={role} />}
              {stepIndex === 7 && <StepVoices role={role} />}

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
      </div>
    </SiteShell>
  );
}
