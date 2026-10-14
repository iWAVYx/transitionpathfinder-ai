import { RoutePageOutlet } from "@/components/RoutePageOutlet";
import { STEPS, Stepper, ProgressBar, StepRole, StepAbout, StepStrengths, StepCareer, StepLifeSkills, StepPlanningContext, StepCurrentGoals, StepVoices, StepNav, TrustRow } from "@/components/pathway/PathwayBuilderSteps";
import { getMyRoles } from "@/lib/profile.functions";
import { audiencesForRoles } from "@/lib/role-policy";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { OwnerWorkspaceGate } from "@/components/dashboard/OwnerWorkspaceGate";
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
import { PathwayBuilderHeader, PATHWAY_FORM_CLASS } from "@/components/pathway/PathwayBuilderHeader";

export const Route = createFileRoute("/_authenticated/pathway")({
  head: () => ({
    meta: [{ title: "Create a Pathway Report — TransitionForward" }],
  }),
  component: () => (
    <RoutePageOutlet><RoleGuard path="/pathway">
      <PathwayPage />
    </RoleGuard></RoutePageOutlet>
  ),
});

function PathwayPage() {
  const { user, loading } = useAuth();
  const scopeKey = JSON.stringify([user?.id ?? null, Boolean(loading)]);
  const currentScope = useRef(scopeKey);
  currentScope.current = scopeKey;
  if (loading || !user)
    return (
      <SiteShell>
        <main className="mx-auto max-w-4xl px-4 py-10" role="status">
          Checking your sign-in before opening Pathway Builder…
        </main>
      </SiteShell>
    );
  return (
    <OwnerWorkspaceGate>
      <PathwaySession
        key={scopeKey}
        viewerId={user.id}
        scopeKey={scopeKey}
        currentScope={currentScope}
      />
    </OwnerWorkspaceGate>
  );
}

function PathwaySession({
  viewerId,
  scopeKey,
  currentScope,
}: {
  viewerId: string;
  scopeKey: string;
  currentScope: { current: string };
}) {
  const generate = useServerFn(createPathwayReport);
  const loadRoles = useServerFn(getMyRoles);
  const [allowedRoles, setAllowedRoles] = useState<Role[]>([]);
  const loadStudents = useServerFn(listStudents);
  const loadSnapshot = useServerFn(getDashboardSnapshot);
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [connectedStudents, setConnectedStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentLoadError, setStudentLoadError] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const studentRequestRef = useRef(0);
  const loadedStudentRef = useRef<string | null>(null);
  const [prefillError, setPrefillError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const generationPending = useRef(false);
  const [generating, setGenerating] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      studentRequestRef.current += 1;
    };
  }, []);
  const current = useCallback(
    () => mounted.current && currentScope.current === scopeKey,
    [currentScope, scopeKey],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(PathwayIntakeFormSchema),
    mode: "onSubmit",
    defaultValues: createPathwayIntakeDefaults(),
  });

  const role = form.watch("submitter_role");
  const connectedStudentId = form.watch("student_id");

  const connectStudent = useCallback(
    async (studentId: string, announce = true) => {
      if (!current() || generationPending.current) return;
      if (!connectedStudents.some((student) => student.id === studentId)) return;
      const currentRole = form.getValues("submitter_role");
      const requestId = ++studentRequestRef.current;
      loadedStudentRef.current = null;
      // Clear every prior answer before the new profile request begins.
      form.reset({
        ...createPathwayIntakeDefaults(),
        submitter_role: currentRole,
        student_id: studentId,
      });
      setPrefillLoading(true);
      setPrefillError(false);
      try {
        const snapshot = await loadSnapshot({
          data: { student_id: studentId, expected_viewer_id: viewerId },
        });
        if (!current() || studentRequestRef.current !== requestId) return;
        if (
          form.getValues("submitter_role") !== currentRole ||
          form.getValues("student_id") !== studentId ||
          snapshot.student?.id !== studentId
        )
          throw new Error("Student profile mismatch");
        const prefill = buildPathwayStudentPrefill(snapshot);
        if (!prefill) throw new Error("Student profile unavailable");
        form.reset({ ...createPathwayIntakeDefaults(), submitter_role: currentRole, ...prefill });
        loadedStudentRef.current = studentId;
        if (announce)
          toast.success("Connected the student and loaded their current profile for review.");
      } catch {
        if (current() && studentRequestRef.current === requestId) {
          setPrefillError(true);
          toast.error("We couldn't load this student's profile. Please try again.");
        }
      } finally {
        if (current() && studentRequestRef.current === requestId) setPrefillLoading(false);
      }
    },
    [form, loadSnapshot, current, viewerId, connectedStudents],
  );

  // Resolve roles before asking for any student data. A failed collection is
  // unavailable, never an empty/manual-entry success.
  useEffect(() => {
    let active = true;
    const valid = () => active && current();
    setStudentsLoading(true);
    setStudentLoadError(false);
    setAllowedRoles([]);
    setConnectedStudents([]);
    void (async () => {
      try {
        const membership = await loadRoles({ data: { expected_viewer_id: viewerId } });
        if (!valid()) return;
        if (
          !Array.isArray(membership?.roles) ||
          !membership.roles.every((role) => typeof role === "string")
        )
          throw new Error("Invalid planning roles");
        const audiences = audiencesForRoles(membership.roles);
        const available = audiences.has("admin")
          ? []
          : (["family", "educator"] as Role[]).filter((role) =>
              audiences.has(role === "family" ? "family" : "educator"),
            );
        setAllowedRoles(available);
        if (!available.length) return;
        if (!available.includes(form.getValues("submitter_role")))
          form.setValue("submitter_role", available[0]);
        const result = await loadStudents({ data: { expected_viewer_id: viewerId } });
        if (!valid()) return;
        if (
          !result ||
          result.loadFailed !== false ||
          !Array.isArray(result.students) ||
          result.students.some((student) => !z.string().uuid().safeParse(student?.id).success) ||
          new Set(result.students.map((student) => student.id)).size !== result.students.length
        )
          throw new Error("Students unavailable");
        setConnectedStudents(result.students);
      } catch {
        if (valid()) setStudentLoadError(true);
      } finally {
        if (valid()) setStudentsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadStudents, loadRoles, form, current, viewerId, loadAttempt]);

  useEffect(() => {
    if (
      !studentsLoading &&
      !studentLoadError &&
      connectedStudents.length === 1 &&
      !form.getValues("student_id")
    )
      void connectStudent(connectedStudents[0].id, false);
  }, [studentsLoading, studentLoadError, connectedStudents, connectStudent, form]);

  const onSubmit = async (values: FormValues) => {
    if (!current() || generationPending.current) return;
    if (studentsLoading || studentLoadError || prefillLoading || prefillError) {
      toast.error(
        "Wait for student access and profile details to finish loading before generating.",
      );
      return;
    }
    if (!allowedRoles.includes(values.submitter_role)) {
      toast.error("Choose a role available to your signed-in account.");
      return;
    }
    if (
      (values.student_id &&
        (!connectedStudents.some((student) => student.id === values.student_id) ||
          loadedStudentRef.current !== values.student_id)) ||
      (connectedStudents.length > 0 && !values.student_id)
    ) {
      setStepIndex(1);
      toast.error("Choose the connected student this report belongs to.");
      return;
    }
    const requestVersion = studentRequestRef.current;
    const requestedStudent = values.student_id ?? null;
    const requestedRole = values.submitter_role;
    const stillCurrent = () =>
      current() &&
      studentRequestRef.current === requestVersion &&
      (form.getValues("student_id") ?? null) === requestedStudent &&
      form.getValues("submitter_role") === requestedRole;
    generationPending.current = true;
    setGenerating(true);
    try {
      setGenerationError(null);
      const merged = mergePathwayIntake(values);
      const res = await generate({ data: { ...merged, expected_viewer_id: viewerId } });
      if (!stillCurrent()) return;
      if (
        !z.string().uuid().safeParse(res?.reportId).success ||
        (res.studentId ?? null) !== requestedStudent
      )
        throw new Error("Report response mismatch");
      await navigate({
        to: "/reports/$reportId",
        params: { reportId: res.reportId },
        search: { welcome: 1 } as never,
      });
    } catch {
      if (stillCurrent()) {
        const message =
          "We couldn't confirm that your report was completed. Check your saved reports before trying again.";
        setGenerationError(message);
        toast.error(message);
      }
    } finally {
      generationPending.current = false;
      if (current()) setGenerating(false);
    }
  };

  const extractionVersion = studentRequestRef.current;
  const applyExtract = (e: IepExtract) => {
    if (
      !current() ||
      generationPending.current ||
      prefillLoading ||
      prefillError ||
      studentRequestRef.current !== extractionVersion ||
      form.getValues("submitter_role") !== role ||
      form.getValues("student_id") !== connectedStudentId
    )
      return;
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
    if (
      !current() ||
      generationPending.current ||
      studentsLoading ||
      prefillLoading ||
      prefillError
    )
      return;
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
      const stepVersion = studentRequestRef.current;
      const ok = await form.trigger("student_first_name");
      if (
        !ok ||
        !current() ||
        generationPending.current ||
        studentRequestRef.current !== stepVersion
      )
        return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (!current() || generationPending.current || prefillLoading) return;
    setStepIndex((i) => Math.max(i - 1, 0));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (studentsLoading || studentLoadError || allowedRoles.length === 0) {
    return (
      <SiteShell>
        <main className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="font-display text-2xl">Pathway Builder</h1>
          <p className="mt-3 text-sm" role={studentLoadError ? "alert" : "status"}>
            {studentsLoading
              ? "Checking your planning role and connected students…"
              : studentLoadError
                ? "We couldn't confirm your planning view and student access. Please try again."
                : "Pathway Builder is available for family and educator planning roles. Open your workspace to use the tools available to your account."}
          </p>
          {studentLoadError && (
            <Button className="mt-4" onClick={() => setLoadAttempt((value) => value + 1)}>
              Reload Planning View
            </Button>
          )}
          {!studentsLoading && !studentLoadError && (
            <Link to="/dashboard" className="mt-4 inline-block underline">
              Return to Your Workspace
            </Link>
          )}
        </main>
      </SiteShell>
    );
  }

  // Match the rule used by onboarding + roadmap: count only steps the user
  // has finished and moved past, so step 1 of N starts at 0% instead of 1/N.
  const progressPct = Math.round((stepIndex / STEPS.length) * 100);

  return (
    <SiteShell>
      <div className="demo-shell">
        <section className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 lg:px-8">
          <Breadcrumbs trail={[{ label: "Pathway Builder" }]} />
          <PathwayBuilderHeader step={stepIndex} role={role} />
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          <Stepper
            current={stepIndex}
            onJump={(i) =>
              !generationPending.current && !prefillLoading && i < stepIndex && setStepIndex(i)
            }
          />
          <ProgressBar pct={progressPct} />

          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              data-testid="pathway-intake-form"
              data-pathway-step={STEPS[stepIndex].id}
              className={PATHWAY_FORM_CLASS}
              noValidate
            >
              {prefillError && (
                <div role="alert" className="rounded-xl border p-4 text-sm">
                  <p>
                    We couldn't load the selected student's profile. Your selection is kept so you
                    can try again.
                  </p>
                  <Button
                    type="button"
                    className="mt-3"
                    onClick={() => {
                      const id = form.getValues("student_id");
                      if (id) void connectStudent(id);
                    }}
                  >
                    Reload Student Profile
                  </Button>
                </div>
              )}
              <fieldset disabled={generating || prefillLoading} className="contents">
                {stepIndex === 0 && (
                  <StepRole
                    allowedRoles={allowedRoles}
                    role={role}
                    onPick={(r) => {
                      if (!generationPending.current && !prefillLoading && allowedRoles.includes(r))
                        form.setValue("submitter_role", r);
                    }}
                  />
                )}
                {stepIndex === 1 && (
                  <StepAbout
                    key={`${role}:${connectedStudentId ?? "manual"}`}
                    viewerId={viewerId}
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

                {generationError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
                  >
                    <p className="font-semibold">The report could not be completed</p>
                    <p className="mt-1">{generationError}</p>
                    <p className="mt-2 text-muted-foreground">
                      Your answers are still in this form. Check your saved reports before trying
                      again in case the request completed after the connection was interrupted.
                    </p>
                    <a
                      href="/reports"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block underline"
                    >
                      Check saved reports in a new tab
                    </a>
                  </div>
                )}

                <StepNav
                  stepIndex={stepIndex}
                  total={STEPS.length}
                  onBack={goBack}
                  onNext={goNext}
                  submitting={generating}
                />
              </fieldset>
            </form>
          </FormProvider>

          <TrustRow />
        </section>
      </div>
    </SiteShell>
  );
}
