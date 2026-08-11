import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GraduationCap,
  HeartHandshake,
  Loader2,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  completeOnboarding,
  getProfile,
  saveOnboardingProgress,
} from "@/lib/profile.functions";
import {
  createStudent,
  ensureOwnStudentProfile,
} from "@/lib/students.functions";
import { getMyActivatedLicenseRole } from "@/lib/access-codes.functions";
import { SchoolPicker } from "@/components/forms/SchoolPicker";
import { fallbackPathFor } from "@/lib/role-policy";
import {
  questionsForRole,
  tipsForRole,
  type OnboardingQuestion,
} from "@/lib/onboarding-questions";
import { Lightbulb } from "lucide-react";

const ROLE_OPTIONS = [
  { id: "student", label: "Student", note: "This is my plan", icon: User },
  { id: "parent", label: "Parent or Guardian", note: "I'm planning with my child", icon: HeartHandshake },
  { id: "educator", label: "Educator or Case Manager", note: "I support students at school — teacher, special educator, transition coordinator, or case manager", icon: GraduationCap },
  { id: "school_admin", label: "School Administrator", note: "I lead transition planning at a single school or building", icon: Users },
  { id: "district_admin", label: "School District Administrator", note: "I oversee transition planning across multiple schools in a district", icon: Users },
  { id: "partner", label: "Partner Organization", note: "I run programs students can join", icon: Users },
] as const;

type RoleId = (typeof ROLE_OPTIONS)[number]["id"];

const GRADE_OPTIONS = [
  { value: "6-8", label: "6th–8th grade (BridgeForward)" },
  { value: "9-10", label: "9th–10th grade" },
  { value: "11-12", label: "11th–12th grade" },
  { value: "post-secondary", label: "Post-secondary" },
  { value: "not-applicable", label: "Not applicable" },
] as const;

const STEPS = ["role", "you", "questions", "student", "tips"] as const;
type StepId = (typeof STEPS)[number];

// Per-prompt answer can be a string (single/text) or string[] (multi).
type AnswerValue = string | string[];
type AnswerMap = Record<string, AnswerValue>;

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — TransitionForward" },
      {
        name: "description",
        content: "A quick guided setup so your dashboard is tuned to how you'll actually use it.",
      },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const loadProfile = useServerFn(getProfile);
  const loadActivatedLicenseRole = useServerFn(getMyActivatedLicenseRole);
  // (loadStudents was used to gate returning users; we now route purely on role.)
  const saveProfile = useServerFn(completeOnboarding);
  const saveProgress = useServerFn(saveOnboardingProgress);
  const addStudent = useServerFn(createStudent);
  const ensureStudentProfile = useServerFn(ensureOwnStudentProfile);

  const [idx, setIdx] = useState(0);
  const [role, setRole] = useState<RoleId | null>(null);
  const [activatedLicenseRole, setActivatedLicenseRole] =
    useState<RoleId | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [studentFirst, setStudentFirst] = useState("");
  const [studentLast, setStudentLast] = useState("");
  const [studentGrade, setStudentGrade] = useState<string>("");
  const [studentSchool, setStudentSchool] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  // Prefill from existing profile (resumable); bounce if onboarding already done.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, licensedRole] = await Promise.all([
          loadProfile(),
          loadActivatedLicenseRole(),
        ]);
        if (cancelled) return;
        const validLicensedRole = ROLE_OPTIONS.some(
          (option) => option.id === licensedRole,
        )
          ? (licensedRole as RoleId)
          : null;
        setActivatedLicenseRole(validLicensedRole);
        if (p.onboarding_completed) {
          const pr = (p.primary_role as RoleId | null) ?? null;
          if (pr) {
            // Send already-onboarded users straight to their primary workspace.
            const target =
              pr === "educator"
                ? "/caseload"
                : pr === "parent" || pr === "student"
                  ? "/dashboard"
                  : fallbackPathFor([pr]);
            navigate({ to: target, replace: true });
            return;
          }
        }
        setRole(validLicensedRole ?? (p.primary_role as RoleId | null) ?? null);
        setFirstName(p.first_name ?? "");
        setLastName(p.last_name ?? "");
        const saved = (p.onboarding_answers ?? {}) as AnswerMap;
        if (saved && typeof saved === "object") setAnswers(saved);
      } catch {
        /* best-effort prefill */
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadActivatedLicenseRole, loadProfile, navigate]);

  // Parents and educators add a student record in onboarding. A "student" role
  // user IS the student, so we auto-create their record from their profile name
  // at finish — no separate student step in the wizard.
  const needsStudent = role === "parent" || role === "educator";
  const roleQuestions = useMemo(() => questionsForRole(role), [role]);
  const hasQuestions = !!roleQuestions && roleQuestions.questions.length > 0;
  const roleTips = useMemo(() => tipsForRole(role), [role]);
  const hasTips = !!roleTips;

  const activeSteps: StepId[] = useMemo(() => {
    const steps: StepId[] = ["role", "you"];
    if (hasQuestions) steps.push("questions");
    if (needsStudent) steps.push("student");
    if (hasTips) steps.push("tips");
    return steps;
  }, [hasQuestions, needsStudent, hasTips]);

  const safeIdx = Math.min(idx, activeSteps.length - 1);
  const stepId: StepId = activeSteps[safeIdx];
  const isLastStep = safeIdx === activeSteps.length - 1;

  // Required keys per role: every `single` question must be answered.
  const requiredAnswered = useMemo(() => {
    if (!roleQuestions) return true;
    return roleQuestions.questions
      .filter((q) => q.type === "single")
      .every((q) => {
        const v = answers[q.key];
        return typeof v === "string" && v.length > 0;
      });
  }, [roleQuestions, answers]);

  const canAdvance = useMemo(() => {
    switch (stepId) {
      case "role":
        return role !== null;
      case "you":
        return firstName.trim().length > 0;
      case "questions":
        return requiredAnswered;
      case "student":
        return studentFirst.trim().length > 0;
      case "tips":
        return true;
    }
  }, [stepId, role, firstName, requiredAnswered, studentFirst]);

  // Progress is computed from actual completion — starts at 0% and only
  // ticks up when the current step is fully filled out.
  const completedSteps = safeIdx + (canAdvance ? 1 : 0);
  const progress = Math.round((completedSteps / activeSteps.length) * 100);

  // Persist progress on step change so refresh resumes where you left off.
  async function persistProgress(nextRole: RoleId | null = role) {
    try {
      await saveProgress({
        data: {
          ...(nextRole ? { primary_role: nextRole } : {}),
          ...(firstName.trim() ? { first_name: firstName.trim() } : {}),
          ...(lastName.trim() ? { last_name: lastName.trim() } : {}),
          onboarding_answers: answers as Record<string, unknown>,
        },
      });
    } catch {
      /* progress save is best-effort; don't block UX */
    }
  }

  const goBack = () => safeIdx > 0 && setIdx(safeIdx - 1);
  const goNext = async () => {
    await persistProgress();
    if (safeIdx < activeSteps.length - 1) setIdx(safeIdx + 1);
  };

  function setAnswer(key: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMulti(key: string, value: string) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }

  async function handleFinish(e: FormEvent) {
    e.preventDefault();
    if (!role || !firstName.trim()) return;
    if (activatedLicenseRole && role !== activatedLicenseRole) {
      toast.error("Finish setup with the account type assigned by your license.");
      return;
    }
    if (needsStudent && !studentFirst.trim()) return;
    setSubmitting(true);
    try {
      // 1) Persist name + primary_role FIRST (without flipping onboarding_completed).
      //    createStudent reads profile.primary_role to wire the right relationship
      //    row (parent → student_guardians, educator → student_team_members), so
      //    primary_role must exist on the profile before we insert the student.
      await saveProgress({
        data: {
          primary_role: role,
          first_name: firstName.trim(),
          last_name: lastName.trim() || undefined,
          onboarding_answers: answers as Record<string, unknown>,
        },
      });

      // 2) Create the linked student record BEFORE marking onboarding complete.
      //    If this fails, the user stays here with onboarding_completed=false so
      //    a refresh resumes the wizard instead of stranding them on /dashboard
      //    with no student.
      if (needsStudent) {
        await addStudent({
          data: {
            first_name: studentFirst.trim(),
            last_name: studentLast.trim() || undefined,
            grade_band: (studentGrade || undefined) as never,
            school: studentSchool.trim() || undefined,
          },
        });
      } else if (role === "student") {
        // Student accounts are the subject of their own plan. This creates or
        // repairs that direct identity link; no self-collaborator is involved.
        await ensureStudentProfile();
      }

      // 3) Now flip onboarding_completed and assign user_roles.
      await saveProfile({
        data: {
          primary_role: role,
          first_name: firstName.trim(),
          last_name: lastName.trim() || undefined,
          onboarding_answers: answers as Record<string, unknown>,
        },
      });

      if (needsStudent) {
        toast.success(`${studentFirst.trim()} is on the dashboard. Let's keep going.`);
      } else {
        toast.success("You're all set. Welcome to TransitionForward.");
      }

      // Send each role to its primary workspace. Educators get /caseload (list
      // view), students/families get /dashboard (per-student view), and the
      // institutional roles fall back through role-policy.
      const target =
        role === "educator"
          ? "/caseload"
          : role === "parent" || role === "student"
            ? "/dashboard"
            : fallbackPathFor([role]);
      navigate({ to: target, replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      console.error("onboarding finish failed", err);
      toast.error(msg, {
        description: "Your progress is saved — try again or come back later.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!bootstrapped) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Get started" }]} />
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {safeIdx + 1} of {activeSteps.length}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="mt-2 h-2" />
        </div>

        <form
          onSubmit={handleFinish}
          className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
        >
          {stepId === "role" && (
            <div className="space-y-5">
              <Header
                eyebrow="Welcome"
                title="Which best describes you?"
                body={
                  activatedLicenseRole
                    ? "Your school or district license has already assigned this account type."
                    : "This shapes the kinds of guidance and resources we surface."
                }
              />
              {activatedLicenseRole ? (
                <p className="border-l-2 border-primary pl-3 text-sm text-muted-foreground">
                  The assigned account type cannot be changed here because it
                  controls the seat and permissions connected to your license.
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {ROLE_OPTIONS.map(({ id, label, note, icon: Icon }) => {
                  const active = role === id;
                  const locked =
                    activatedLicenseRole !== null && id !== activatedLicenseRole;
                  return (
                    <button
                      type="button"
                      key={id}
                      disabled={locked}
                      onClick={() => {
                        if (locked) return;
                        setRole(id);
                        // Reset answers when role changes since the question set is different.
                        if (role !== id) setAnswers({});
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border bg-background p-4 text-left transition-colors",
                        active
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/40",
                        locked && "cursor-not-allowed opacity-45",
                      )}
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs text-muted-foreground">{note}</p>
                      </div>
                      {active && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {stepId === "you" && (
            <div className="space-y-5">
              <Header
                eyebrow="About you"
                title="What should we call you?"
                body="Used on your dashboard, share links, and meeting prep handouts."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="you-first">First name</Label>
                  <Input
                    id="you-first"
                    autoFocus
                    maxLength={80}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Jordan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="you-last">Last name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="you-last"
                    maxLength={80}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {stepId === "questions" && roleQuestions && (
            <div className="space-y-6">
              <Header
                eyebrow="A few quick questions"
                title={roleQuestions.title}
                body={roleQuestions.body}
              />
              <div className="space-y-6">
                {roleQuestions.questions.map((q) => (
                  <QuestionField
                    key={q.key}
                    question={q}
                    value={answers[q.key]}
                    onSetSingle={(v) => setAnswer(q.key, v)}
                    onToggleMulti={(v) => toggleMulti(q.key, v)}
                    onSetText={(v) => setAnswer(q.key, v)}
                  />
                ))}
              </div>
            </div>
          )}

          {stepId === "student" && (
            <div className="space-y-5">
              <Header
                eyebrow="Your student"
                title="Add your first student"
                body="You can edit this any time, share it securely, or add more students later."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="s-first">Student first name *</Label>
                  <Input
                    id="s-first"
                    autoFocus
                    maxLength={80}
                    value={studentFirst}
                    onChange={(e) => setStudentFirst(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-last">Student last name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="s-last"
                    maxLength={80}
                    value={studentLast}
                    onChange={(e) => setStudentLast(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-grade">Grade band</Label>
                  <select
                    id="s-grade"
                    value={studentGrade}
                    onChange={(e) => setStudentGrade(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">—</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="s-school">School <span className="text-muted-foreground">(optional)</span></Label>
                  <SchoolPicker
                    id="s-school"
                    value={studentSchool}
                    onChange={setStudentSchool}
                  />
                </div>
              </div>
            </div>
          )}

          {stepId === "tips" && roleTips && (
            <div className="space-y-5">
              <Header
                eyebrow="You're Set"
                title={roleTips.title}
                body={roleTips.body}
              />
              <ul className="space-y-3">
                {roleTips.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border bg-background p-4 text-sm"
                  >
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}


          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={safeIdx === 0 || submitting}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            {!isLastStep ? (
              <Button
                type="button"
                onClick={goNext}
                disabled={!canAdvance}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={!canAdvance || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Finish & open dashboard
                  </>
                )}
              </Button>
            )}
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Your data is private. You control who sees the student profile.
        </p>
      </section>
    </SiteShell>
  );
}

function Header({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function QuestionField({
  question,
  value,
  onSetSingle,
  onToggleMulti,
  onSetText,
}: {
  question: OnboardingQuestion;
  value: AnswerValue | undefined;
  onSetSingle: (v: string) => void;
  onToggleMulti: (v: string) => void;
  onSetText: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">{question.label}</p>
        {question.help && (
          <p className="mt-1 text-xs text-muted-foreground">{question.help}</p>
        )}
      </div>

      {question.type === "single" && question.options && (
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => onSetSingle(opt.value)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border bg-background px-3 py-2 text-left text-sm transition-colors",
                  active ? "border-primary bg-primary/5" : "hover:border-primary/40",
                )}
              >
                <span>{opt.label}</span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "multi" && question.options && (
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((opt) => {
            const list = Array.isArray(value) ? value : [];
            const active = list.includes(opt.value);
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => onToggleMulti(opt.value)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border bg-background px-3 py-2 text-left text-sm transition-colors",
                  active ? "border-primary bg-primary/5" : "hover:border-primary/40",
                )}
              >
                <span>{opt.label}</span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "text" && (
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onSetText(e.target.value)}
          placeholder={question.placeholder}
          maxLength={question.maxLength ?? 500}
          rows={3}
        />
      )}
    </div>
  );
}
