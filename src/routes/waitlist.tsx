import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  HeartHandshake,
  GraduationCap,
  Users,
  Building2,
  Briefcase,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
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
import { submitWaitlist } from "@/lib/waitlist.functions";

import { toTitleCase } from "@/lib/title-case";
type RoleKey = "family" | "student" | "educator" | "district" | "partner";

const ROLE_OPTIONS: {
  key: RoleKey;
  label: string;
  blurb: string;
  cta: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "family",
    label: "Family / caregiver",
    blurb:
      "Build a clear, calm transition plan for your child — and stop chasing paperwork between meetings.",
    cta: "Join the family waitlist",
    icon: <HeartHandshake className="h-5 w-5" />,
  },
  {
    key: "student",
    label: "Student",
    blurb:
      "Explore careers, college, training, and life after high school — in your own voice.",
    cta: "Explore my future path",
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    key: "educator",
    label: "Educator / case manager",
    blurb:
      "Organize transition planning for your caseload without doubling your documentation load.",
    cta: "Request an educator demo",
    icon: <Users className="h-5 w-5" />,
  },
  {
    key: "district",
    label: "School or district leader",
    blurb:
      "See how TransitionForward complements CT SEDS and improves outcomes across your buildings.",
    cta: "Request a school demo",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    key: "partner",
    label: "Community partner",
    blurb:
      "Colleges, technical programs, BRS, employers, mentorship — connect with students who fit.",
    cta: "Become a partner",
    icon: <Briefcase className="h-5 w-5" />,
  },
];

const Schema = z.object({
  full_name: z.string().trim().min(1, "Required").max(200),
  email: z.string().trim().email("Enter a valid email").max(255),
  role: z.enum(["family", "student", "educator", "district", "partner"]),
  state: z.string().trim().max(100).optional(),
  student_grade_band: z
    .enum(["9-10", "11-12", "post-secondary", "not-applicable"])
    .optional(),
  reason: z.string().trim().max(2000).optional(),
});

type FormValues = z.infer<typeof Schema>;

export const Route = createFileRoute("/waitlist")({
  head: () => ({
    meta: [
      { title: "Join the pilot — TransitionForward" },
      {
        name: "description",
        content:
          "Request early access to TransitionForward — separate paths for families, students, educators, schools, and partner organizations.",
      },
      { property: "og:url", content: "/waitlist" },
    ],
    links: [{ rel: "canonical", href: "/waitlist" }],
  }),
  component: WaitlistPage,
});

function WaitlistPage() {
  const [selected, setSelected] = useState<RoleKey | null>(null);
  const [done, setDone] = useState(false);
  const submit = useServerFn(submitWaitlist);

  // Pick up ?role= or ?audience= from URL. Each "door" on entry points like
  // /partners or /educators can route here with their audience preselected.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("role") ?? params.get("audience");
    if (!raw) return;
    // Map common audience aliases to internal role keys.
    const ALIAS: Record<string, RoleKey> = {
      family: "family",
      families: "family",
      parent: "family",
      student: "student",
      students: "student",
      educator: "educator",
      educators: "educator",
      teacher: "educator",
      school: "district",
      schools: "district",
      district: "district",
      partner: "partner",
      partners: "partner",
    };
    const key = ALIAS[raw.toLowerCase()];
    if (key) setSelected(key);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      full_name: "",
      email: "",
      role: "family",
      state: "CT",
      student_grade_band: undefined,
      reason: "",
    },
  });

  useEffect(() => {
    if (selected) form.setValue("role", selected);
  }, [selected, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await submit({ data: { ...values, source: "waitlist-tiles" } });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const current = ROLE_OPTIONS.find((o) => o.key === selected) ?? null;

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-0 -z-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-10 -z-10 h-72 w-72 rounded-full bg-accent/30 blur-3xl"
        />
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <header className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <HeartHandshake className="h-3.5 w-3.5" /> Come walk with us
            </span>
            <h1 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
              You don't have to figure this out alone.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Pick the door that fits you best. We're opening separate seats for families,
              students, educators, school leaders, and partner organizations.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-xs text-muted-foreground/80">
              A real person on our Connecticut team reads every submission — usually within two school days.
            </p>
          </header>


          {!done && !current && (
            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:[&>*]:col-span-2 lg:[&>*:nth-child(4)]:col-start-2 lg:[&>*:nth-child(5)]:col-start-4">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelected(opt.key)}
                  className="group flex flex-col rounded-3xl border border-border bg-card p-6 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-hero text-primary">
                    {opt.icon}
                  </span>
                  <h2 className="mt-4 font-display text-xl font-medium">{toTitleCase(opt.label)}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{opt.blurb}</p>
                  <span className="mt-auto pt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    {opt.cta}{" "}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {!done && !current && (
            <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                Private &amp; encrypted
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                Built in Connecticut
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                No spam — ever
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                You can leave anytime
              </span>
            </div>
          )}


          {!done && current && (
            <div className="mt-10 grid gap-6 md:grid-cols-5">
              <aside className="rounded-3xl border bg-card p-6 shadow-soft md:col-span-2">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-hero text-primary">
                  {current.icon}
                </span>
                <h2 className="mt-4 font-display text-2xl font-medium">{toTitleCase(current.label)}</h2>
                <p className="mt-3 text-sm text-muted-foreground">{current.blurb}</p>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="mt-6 text-xs font-semibold uppercase tracking-wider text-primary underline-offset-4 hover:underline"
                >
                  ← Pick a different door
                </button>
              </aside>

              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5 rounded-3xl border bg-card p-6 shadow-soft md:col-span-3 md:p-8"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" error={form.formState.errors.full_name?.message}>
                    <Input {...form.register("full_name")} placeholder="Your name" />
                  </Field>
                  <Field label="Email" error={form.formState.errors.email?.message}>
                    <Input
                      type="email"
                      {...form.register("email")}
                      placeholder="you@example.com"
                    />
                  </Field>
                </div>

                <Field label="State">
                  <Input {...form.register("state")} placeholder="CT" maxLength={100} />
                </Field>

                {(current.key === "family" || current.key === "student") && (
                  <Field label="Student grade band">
                    <Select
                      onValueChange={(v) =>
                        form.setValue(
                          "student_grade_band",
                          v as FormValues["student_grade_band"],
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9-10">9th – 10th (Launch / Explore)</SelectItem>
                        <SelectItem value="11-12">11th – 12th (Plan / Execute)</SelectItem>
                        <SelectItem value="post-secondary">Post-secondary (18–21)</SelectItem>
                        <SelectItem value="not-applicable">Not applicable</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                <Field
                  label={
                    current.key === "partner"
                      ? "Tell us about your organization"
                      : current.key === "district"
                        ? "Your school or district"
                        : "What brought you here? (optional)"
                  }
                  error={form.formState.errors.reason?.message}
                >
                  <Textarea
                    rows={4}
                    maxLength={2000}
                    {...form.register("reason")}
                    placeholder={
                      current.key === "partner"
                        ? "Programs offered, regions served, who you'd like to reach."
                        : current.key === "district"
                          ? "District, role, and what you're hoping to evaluate."
                          : "Anything you'd like us to know."
                    }
                  />
                </Field>

                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full"
                >
                  {form.formState.isSubmitting ? "Submitting…" : current.cta}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  We'll never share your information. See our{" "}
                  <a href="/privacy" className="underline">
                    privacy notice
                  </a>
                  .
                </p>
              </form>
            </div>
          )}

          {done && current && (
            <div className="mx-auto mt-12 max-w-2xl rounded-3xl border bg-card p-8 shadow-soft sm:p-10">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-hero text-primary">
                  {current.icon}
                </span>
                <div>
                  <h2 className="font-display text-3xl font-medium leading-tight">
                    You're in. Thank you for trusting us with this.
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    A real person on our Connecticut team reads every submission.
                    Here's exactly what happens next.
                  </p>
                </div>
              </div>

              <ol className="mt-7 space-y-4 border-l-2 border-primary/20 pl-5">
                <NextStep
                  n={1}
                  title="Within 2 school days"
                  body="We'll send a personal email confirming we received your request and routing it to the right teammate."
                />
                <NextStep
                  n={2}
                  title="Within 1–2 weeks"
                  body={
                    current.key === "district" || current.key === "partner"
                      ? "We'll schedule a 20-minute intro call to learn about your goals, caseload, and timeline."
                      : current.key === "educator"
                        ? "We'll invite you to a short educator walkthrough and share the case-manager onboarding pack."
                        : "We'll invite you to the next family cohort and share your private invite link to set up the Student Hub."
                  }
                />
                <NextStep
                  n={3}
                  title="When you're ready"
                  body="You'll set up your first student profile with us on a live, no-pressure call — or on your own if you prefer."
                />
              </ol>

              <div className="mt-8 rounded-2xl border border-border/60 bg-muted/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  While you wait
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  These pages were built specifically for {current.label.toLowerCase()} —
                  they'll give you the clearest sense of what TransitionForward feels like in practice.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="/demo"
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
                  >
                    Walk the 6-step demo <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={
                      current.key === "family" || current.key === "student"
                        ? "/families"
                        : current.key === "educator"
                          ? "/educators"
                          : current.key === "district"
                            ? "/platform"
                            : "/partners"
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40"
                  >
                    {current.key === "family" || current.key === "student"
                      ? "For Families"
                      : current.key === "educator"
                        ? "For Educators"
                        : current.key === "district"
                          ? "The Platform"
                          : "Partner overview"}
                  </a>
                  <a
                    href="/framework"
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40"
                  >
                    The framework
                  </a>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5 text-xs text-muted-foreground">
                <span>
                  Didn't get a confirmation email? Check spam, or{" "}
                  <a href="/contact" className="underline underline-offset-2">
                    message us directly
                  </a>
                  .
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDone(false);
                    setSelected(null);
                    form.reset();
                  }}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Submit another role →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 inline-block">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function NextStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="relative">
      <span className="absolute -left-[30px] flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
        {n}
      </span>
      <p className="font-display text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </li>
  );
}
