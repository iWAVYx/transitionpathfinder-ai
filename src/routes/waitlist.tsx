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
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-5">
          <div className="rounded-3xl bg-gradient-hero p-8 shadow-soft md:col-span-2 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Pilot access
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
              Join the TransitionForward pilot.
            </h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Built by a CT special education teacher, grounded in IDEA transition
              requirements and evidence-based predictors of post-school success.
            </p>
            <div className="mt-8 grid gap-4">
              <FeatureTile title="For families" body="A clear roadmap from 9th grade to exit, with next-best actions for your student." />
              <FeatureTile title="For educators" body="Compliance-ready transition planning, without the binder of redundant forms." />
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
      <h2 className="mt-6 font-display text-2xl font-semibold text-foreground">
        You're on the list.
      </h2>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Thanks for joining the TransitionForward pilot. We'll be in touch with next steps
        as we open seats for families and educators in Connecticut.
      </p>
      <a
        href="/framework"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
      >
        Explore the framework
      </a>
    </div>
  );
}
