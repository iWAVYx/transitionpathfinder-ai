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
import { PublicJourneyStrip } from "@/components/site/PublicJourneyStrip";
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
import { Checkbox } from "@/components/ui/checkbox";
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
    .enum(["6-8", "9-10", "11-12", "post-secondary", "not-applicable"])
    .optional(),
  // Organization / school / district context — branched by selected door.
  organization_name: z.string().trim().max(200).optional(),
  district_name: z.string().trim().max(200).optional(),
  school_name: z.string().trim().max(200).optional(),
  reason: z.string().trim().max(2000).optional(),

  // New routing fields collected per role
  wants_demo: z.boolean().optional(),
  connected_to_student: z.boolean().optional(),
  urgency: z.enum(["exploring", "this_quarter", "this_year", "asap"]).optional(),
  referral_source: z.string().trim().max(200).optional(),
  caseload_size: z.coerce.number().int().min(0).max(100000).optional(),
  estimated_student_count: z.coerce.number().int().min(0).max(10000000).optional(),
  estimated_school_count: z.coerce.number().int().min(0).max(100000).optional(),
  service_area: z.string().trim().max(500).optional(),
  populations_supported: z.string().trim().max(1000).optional(),
  services_offered: z.string().trim().max(2000).optional(),

  // Required consent — the public waitlist RLS policy also enforces this.
  consent_to_contact: z
    .boolean()
    .refine((v) => v === true, "Please confirm we can contact you."),
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
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

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
      parents: "family",
      caregiver: "family",
      student: "student",
      students: "student",
      educator: "educator",
      educators: "educator",
      teacher: "educator",
      teachers: "educator",
      "case-manager": "educator",
      school: "district",
      schools: "district",
      district: "district",
      districts: "district",
      administrator: "district",
      admin: "district",
      leader: "district",
      partner: "partner",
      partners: "partner",
      community: "partner",
    };
    const key = ALIAS[raw.toLowerCase()];
    if (key) {
      setSelected(key);
      // Wait for the form to mount, then smooth-scroll (via Lenis if
      // present so it matches sitewide easing) and move focus to the
      // first field for keyboard / screen-reader users.
      const prefersReduced =
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      let attempts = 0;
      const tryScroll = () => {
        const el = document.getElementById("waitlist-form");
        if (!el) {
          if (attempts++ < 20) requestAnimationFrame(tryScroll);
          return;
        }
        // Sticky header on this site is ~64px; pad extra so the focused
        // field is comfortably below it (not clipped or visually merged).
        const headerOffset = 96;
        const lenis = window.__lenis;
        if (lenis && !prefersReduced) {
          lenis.scrollTo(el, { offset: -headerOffset });
        } else {
          const top =
            el.getBoundingClientRect().top + window.scrollY - headerOffset;
          window.scrollTo({
            top,
            behavior: prefersReduced ? "auto" : "smooth",
          });
        }
        // Move focus to the first focusable field. Use preventScroll so
        // the browser doesn't jump past our smooth-scrolled position,
        // then nudge into view if it ended up under the sticky header.
        window.setTimeout(() => {
          const firstField = el.querySelector<HTMLElement>(
            'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
          );
          if (!firstField) return;
          // Briefly highlight the focus ring so it is unmistakable on landing.
          firstField.classList.add(
            "ring-2",
            "ring-primary",
            "ring-offset-2",
            "ring-offset-background",
          );
          firstField.focus({ preventScroll: true });
          const rect = firstField.getBoundingClientRect();
          if (rect.top < headerOffset) {
            const correction =
              window.scrollY + rect.top - headerOffset;
            if (lenis && !prefersReduced) {
              lenis.scrollTo(correction);
            } else {
              window.scrollTo({
                top: correction,
                behavior: prefersReduced ? "auto" : "smooth",
              });
            }
          }
          window.setTimeout(() => {
            firstField.classList.remove(
              "ring-2",
              "ring-primary",
              "ring-offset-2",
              "ring-offset-background",
            );
          }, 1800);
        }, prefersReduced ? 0 : 600);
      };
      requestAnimationFrame(tryScroll);
    }
  }, []);

  // Recompute clearance on resize / orientationchange while a role is
  // selected. Layout shifts (mobile rotation, browser-chrome show/hide,
  // dynamic viewport units) can push the first field back under the sticky
  // header even after the initial deep-link jump — re-correct silently.
  useEffect(() => {
    if (!selected || done) return;
    if (typeof window === "undefined") return;

    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const headerOffset = 96;
    let raf = 0;

    const recompute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const form = document.getElementById("waitlist-form");
        if (!form) return;
        const active = document.activeElement as HTMLElement | null;
        const target =
          active && form.contains(active)
            ? active
            : form.querySelector<HTMLElement>(
                'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
              );
        if (!target) return;
        const rect = target.getBoundingClientRect();
        if (rect.top >= headerOffset && rect.bottom <= window.innerHeight) {
          return; // already visible and clear of header
        }
        const correction = window.scrollY + rect.top - headerOffset;
        const lenis = window.__lenis;
        if (lenis && !prefersReduced) {
          lenis.scrollTo(correction);
        } else {
          window.scrollTo({
            top: correction,
            behavior: prefersReduced ? "auto" : "smooth",
          });
        }
      });
    };

    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
    };
  }, [selected, done]);

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      full_name: "",
      email: "",
      role: "family",
      state: "CT",
      student_grade_band: undefined,
      reason: "",
      wants_demo: false,
      consent_to_contact: false,
    },
  });

  useEffect(() => {
    if (selected) form.setValue("role", selected);
  }, [selected, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const role = (selected ?? values.role) as RoleKey;
      await submit({
        data: {
          ...values,
          role,
          source: "waitlist-tiles",
          consent_to_contact: true,
        },
      });
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
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
          <div className="mb-6">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground/80 backdrop-blur transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
          <header className="text-center">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <HeartHandshake className="h-3.5 w-3.5" /> Come walk with us
            </span>
            <h1 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
              You don't have to figure this out alone.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              The waitlist is how we route access — for families, students,
              educators, school and district leaders, and partner
              organizations. Pick the door that fits you and we'll qualify
              the right next step (early access, demo, pilot, or partner review).
            </p>
            <p className="mx-auto mt-3 max-w-xl text-xs text-muted-foreground/80">
              Already have an invitation or active access?{" "}
              <a href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                Sign in instead →
              </a>
            </p>
            <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground/80">
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
            <div id="waitlist-form" className="mt-10 grid scroll-mt-24 gap-6 md:grid-cols-5">
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
                  <Field label="Your Name" error={form.formState.errors.full_name?.message}>
                    <Input {...form.register("full_name")} placeholder="Your Name" />
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
                        <SelectItem value="6-8">6th – 8th (BridgeForward · high school choice)</SelectItem>
                        <SelectItem value="9-10">9th – 10th (Launch / Explore)</SelectItem>
                        <SelectItem value="11-12">11th – 12th (Plan / Execute)</SelectItem>
                        <SelectItem value="post-secondary">Post-secondary (18–21)</SelectItem>
                        <SelectItem value="not-applicable">Not applicable</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {current.key === "educator" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="School (optional)">
                      <Input {...form.register("school_name")} placeholder="e.g. Hartford Public HS" maxLength={200} />
                    </Field>
                    <Field label="District (optional)">
                      <Input {...form.register("district_name")} placeholder="e.g. Hartford Public Schools" maxLength={200} />
                    </Field>
                  </div>
                )}

                {current.key === "district" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="District">
                      <Input {...form.register("district_name")} placeholder="District name" maxLength={200} />
                    </Field>
                    <Field label="School (if just one building)">
                      <Input {...form.register("school_name")} placeholder="Leave blank for district-wide" maxLength={200} />
                    </Field>
                  </div>
                )}

                {current.key === "partner" && (
                  <>
                    <Field label="Organization">
                      <Input {...form.register("organization_name")} placeholder="Organization name" maxLength={200} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Services offered">
                        <Input {...form.register("services_offered")} placeholder="e.g. paid internships, mentorship, training" maxLength={2000} />
                      </Field>
                      <Field label="Service area">
                        <Input {...form.register("service_area")} placeholder="e.g. Hartford County, statewide" maxLength={500} />
                      </Field>
                    </div>
                    <Field label="Populations supported (optional)">
                      <Input {...form.register("populations_supported")} placeholder="e.g. students 16–22 with IEPs" maxLength={1000} />
                    </Field>
                    <p className="rounded-md border border-amber-500/30 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      Partner accounts manage opportunities and PartnerForward resources.
                      Partners never see private student data.
                    </p>
                  </>
                )}

                {current.key === "educator" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Caseload size (approx.)">
                      <Input type="number" min={0} {...form.register("caseload_size")} placeholder="e.g. 18" />
                    </Field>
                    <Field label="Wants a demo?">
                      <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                        <Checkbox
                          checked={!!form.watch("wants_demo")}
                          onCheckedChange={(v) => form.setValue("wants_demo", v === true)}
                        />
                        Yes, schedule a walkthrough
                      </label>
                    </Field>
                  </div>
                )}

                {current.key === "district" && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Est. students">
                      <Input type="number" min={0} {...form.register("estimated_student_count")} placeholder="e.g. 4200" />
                    </Field>
                    <Field label="Est. schools">
                      <Input type="number" min={0} {...form.register("estimated_school_count")} placeholder="e.g. 7" />
                    </Field>
                    <Field label="Timeline">
                      <Select onValueChange={(v) => form.setValue("urgency", v as FormValues["urgency"])}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exploring">Just exploring</SelectItem>
                          <SelectItem value="this_quarter">This quarter</SelectItem>
                          <SelectItem value="this_year">This school year</SelectItem>
                          <SelectItem value="asap">As soon as possible</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                )}

                {(current.key === "family" || current.key === "student") && (
                  <Field label="Are you currently connected to a student in an active school?">
                    <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                      <Checkbox
                        checked={!!form.watch("connected_to_student")}
                        onCheckedChange={(v) => form.setValue("connected_to_student", v === true)}
                      />
                      Yes, the student has an active school or district
                    </label>
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

                <Field
                  label=""
                  error={form.formState.errors.consent_to_contact?.message as string | undefined}
                >
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={!!form.watch("consent_to_contact")}
                      onCheckedChange={(v) => form.setValue("consent_to_contact", v === true, { shouldValidate: true })}
                      className="mt-0.5"
                    />
                    <span>
                      I consent to be contacted by the TransitionForward team
                      about my request. (Required)
                    </span>
                  </label>
                </Field>

                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || !form.watch("consent_to_contact")}
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
                  title="You're on the waitlist"
                  body="A real person on our Connecticut team reads every submission — usually within two school days."
                />
                <NextStep
                  n={2}
                  title="We review your fit"
                  body={
                    current.key === "district" || current.key === "partner"
                      ? "We'll match your request to the next open pilot cohort and schedule a 20-minute intro call."
                      : current.key === "educator"
                        ? "We'll match your request to an educator cohort or an existing school pilot in your area."
                        : "We'll match you to a family cohort or an existing school pilot in your district."
                  }
                />
                <NextStep
                  n={3}
                  title="You may be invited"
                  body="Invitations go out based on role, organization, and pilot capacity. If you're not in the first wave, we'll keep you posted as cohorts open."
                />
                <NextStep
                  n={4}
                  title="When your school or district joins"
                  body="Connected families, students, and educators in that building can be invited in too — no separate signup required."
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
                    className="inline-flex items-center justify-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
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
                    className="inline-flex items-center justify-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40"
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
                    href="/programs/transitionforward"
                    className="inline-flex items-center justify-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40"
                  >
                    TransitionForward (9–12)
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
