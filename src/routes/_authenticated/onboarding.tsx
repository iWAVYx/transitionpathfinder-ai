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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { completeOnboarding, getProfile } from "@/lib/profile.functions";
import { createStudent, listStudents } from "@/lib/students.functions";
import { SchoolPicker } from "@/components/forms/SchoolPicker";

const ROLE_OPTIONS = [
  { id: "student", label: "Student", note: "This is my plan", icon: User },
  { id: "parent", label: "Parent or Guardian", note: "I'm planning with my child", icon: HeartHandshake },
  { id: "educator", label: "Educator or Case Manager", note: "I support students at school — teacher, special educator, transition coordinator, or case manager", icon: GraduationCap },
  { id: "school_admin", label: "School Administrator", note: "I lead a school or district's transition program", icon: Users },
  { id: "partner", label: "Partner Organization", note: "I run programs students can join", icon: Users },
] as const;

type RoleId = (typeof ROLE_OPTIONS)[number]["id"];

const GRADE_OPTIONS = [
  { value: "9-10", label: "9th–10th grade" },
  { value: "11-12", label: "11th–12th grade" },
  { value: "post-secondary", label: "Post-secondary" },
  { value: "not-applicable", label: "Not applicable" },
] as const;

const STEPS = ["role", "you", "student"] as const;
type StepId = (typeof STEPS)[number];

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — TransitionForward" },
      {
        name: "description",
        content: "A quick 3-step setup: tell us your role, your name, and add your first student.",
      },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const loadProfile = useServerFn(getProfile);
  const loadStudents = useServerFn(listStudents);
  const saveProfile = useServerFn(completeOnboarding);
  const addStudent = useServerFn(createStudent);

  const [idx, setIdx] = useState(0);
  const [role, setRole] = useState<RoleId | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentFirst, setStudentFirst] = useState("");
  const [studentLast, setStudentLast] = useState("");
  const [studentGrade, setStudentGrade] = useState<string>("");
  const [studentSchool, setStudentSchool] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  // Prefill from existing profile; bounce if onboarding already done.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, list] = await Promise.all([loadProfile(), loadStudents()]);
        if (cancelled) return;
        if (p.onboarding_completed && list.students.length > 0) {
          navigate({ to: "/dashboard", replace: true });
          return;
        }
        setRole((p.primary_role as RoleId | null) ?? null);
        setFirstName(p.first_name ?? "");
        setLastName(p.last_name ?? "");
      } catch {
        /* best-effort prefill */
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfile, loadStudents, navigate]);

  const stepId: StepId = STEPS[idx];
  const progress = Math.round(((idx + 1) / STEPS.length) * 100);

  const canAdvance = useMemo(() => {
    switch (stepId) {
      case "role":
        return role !== null;
      case "you":
        return firstName.trim().length > 0;
      case "student":
        return studentFirst.trim().length > 0;
    }
  }, [stepId, role, firstName, studentFirst]);

  const goBack = () => idx > 0 && setIdx(idx - 1);
  const goNext = () => idx < STEPS.length - 1 && setIdx(idx + 1);

  async function handleFinish(e: FormEvent) {
    e.preventDefault();
    if (!role || !firstName.trim() || !studentFirst.trim()) return;
    setSubmitting(true);
    try {
      await saveProfile({
        data: {
          primary_role: role,
          first_name: firstName.trim(),
          last_name: lastName.trim() || undefined,
        },
      });
      await addStudent({
        data: {
          first_name: studentFirst.trim(),
          last_name: studentLast.trim() || undefined,
          grade_band: (studentGrade || undefined) as never,
          school: studentSchool.trim() || undefined,
        },
      });
      toast.success(`${studentFirst.trim()} is on the dashboard. Let's keep going.`);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      console.error("onboarding finish failed", err);
      toast.error(msg);
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
            <span>Step {idx + 1} of {STEPS.length}</span>
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
                body="This shapes the kinds of guidance and resources we surface."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {ROLE_OPTIONS.map(({ id, label, note, icon: Icon }) => {
                  const active = role === id;
                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setRole(id)}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border bg-background p-4 text-left transition-colors",
                        active
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/40",
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

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={idx === 0 || submitting}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            {stepId !== "student" ? (
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
