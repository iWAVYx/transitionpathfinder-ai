import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

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
import waitlistHero from "@/assets/waitlist-hero.jpg";

const Schema = z.object({
  full_name: z.string().trim().min(1, "Required").max(200),
  email: z.string().trim().email("Enter a valid email").max(255),
  role: z.enum(["parent", "educator", "administrator", "other"]),
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
          "Request early access to TransitionForward — a transition planning hub for CT families and educators.",
      },
    ],
  }),
  component: WaitlistPage,
});

function WaitlistPage() {
  const [done, setDone] = useState(false);
  const submit = useServerFn(submitWaitlist);
  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      full_name: "",
      email: "",
      role: "parent",
      state: "CT",
      student_grade_band: undefined,
      reason: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await submit({ data: { ...values, source: "marketing-site" } });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-5">
            <div className="relative overflow-hidden rounded-3xl shadow-lift md:col-span-2">
              <img
                src={waitlistHero}
                alt=""
                aria-hidden
                width={1600}
                height={1200}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/75 to-background/50" />
              <div className="relative p-8 md:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Come walk with us
                </p>
                <h1 className="mt-3 font-display text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                  You don't have to figure this out alone.
                </h1>
                <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                  We're inviting a small group of Connecticut families and educators
                  into the TransitionForward pilot. Built by a special-education
                  teacher, grounded in the research that actually predicts a good
                  life after high school.
                </p>
                <div className="mt-8 grid gap-4">
                  <FeatureTile title="For families" body="A steadier hand through every grade — translating the plan, suggesting the next gentle step, holding the bigger picture so you don't have to." />
                  <FeatureTile title="For educators" body="Compliance-ready transition planning without the binder of redundant forms — and finally, a tool families can use between PPT meetings." />
                </div>
              </div>
            </div>



          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft md:col-span-3 md:p-8">
            {done ? (
              <SuccessCard />
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" error={form.formState.errors.full_name?.message}>
                    <Input {...form.register("full_name")} placeholder="Your name" />
                  </Field>
                  <Field label="Email" error={form.formState.errors.email?.message}>
                    <Input type="email" {...form.register("email")} placeholder="you@example.com" />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="I am a…" error={form.formState.errors.role?.message}>
                    <Select
                      defaultValue={form.getValues("role")}
                      onValueChange={(v) => form.setValue("role", v as FormValues["role"])}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent / caregiver</SelectItem>
                        <SelectItem value="educator">Educator</SelectItem>
                        <SelectItem value="administrator">Administrator</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="State">
                    <Input {...form.register("state")} placeholder="CT" maxLength={100} />
                  </Field>
                </div>

                <Field label="Student grade band (optional)">
                  <Select
                    onValueChange={(v) =>
                      form.setValue("student_grade_band", v as FormValues["student_grade_band"])
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9-10">9th – 10th (Launch / Explore)</SelectItem>
                      <SelectItem value="11-12">11th – 12th (Plan / Execute)</SelectItem>
                      <SelectItem value="post-secondary">Post-secondary (18–21)</SelectItem>
                      <SelectItem value="not-applicable">Not applicable</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="What brought you here? (optional)" error={form.formState.errors.reason?.message}>
                  <Textarea rows={4} maxLength={2000} {...form.register("reason")} placeholder="Anything you'd like us to know about your student or your school." />
                </Field>

                <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                  {form.formState.isSubmitting ? "Submitting…" : "Request access"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  We'll never share your information. See our <a href="/privacy" className="underline">privacy notice</a>.
                </p>
              </form>
            )}
            </div>
          </div>
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

function FeatureTile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur">
      <p className="font-display text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function SuccessCard() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="rounded-full bg-gradient-hero p-4 shadow-soft">
        <span className="block h-10 w-10 rounded-full bg-primary/20" />
      </div>
      <h2 className="mt-6 font-display text-3xl font-medium text-foreground">
        You're in. Thank you for trusting us with this.
      </h2>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        We'll reach out personally as we open the next round of seats for
        Connecticut families and educators. In the meantime, take a quiet
        walk through the framework — it's the heart of everything we'll
        build with you.
      </p>
      <a
        href="/framework"
        className="mt-7 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
      >
        Walk through the framework
      </a>
    </div>
  );
}
