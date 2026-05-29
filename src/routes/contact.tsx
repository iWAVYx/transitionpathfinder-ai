import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, MessageCircle, LifeBuoy, ShieldCheck } from "lucide-react";

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
  full_name: z.string().trim().min(1, "Please tell us your name").max(200),
  email: z.string().trim().email("Enter a valid email").max(255),
  topic: z.enum([
    "family-question",
    "educator-question",
    "district-demo",
    "press-research",
    "accessibility",
    "other",
  ]),
  message: z
    .string()
    .trim()
    .min(5, "A sentence or two helps us route this to the right person")
    .max(2000),
});

type FormValues = z.infer<typeof Schema>;

const TOPIC_TO_ROLE: Record<FormValues["topic"], "family" | "educator" | "district" | "partner" | "other"> = {
  "family-question": "family",
  "educator-question": "educator",
  "district-demo": "district",
  "press-research": "other",
  "accessibility": "other",
  "other": "other",
};

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Help — TransitionForward" },
      {
        name: "description",
        content:
          "Ask a question, request a demo, or report an accessibility issue. We answer every message personally during the pilot.",
      },
      { property: "og:title", content: "Contact & Help — TransitionForward" },
      {
        property: "og:description",
        content:
          "Real people answer every message during the pilot. Families, educators, districts, and partners all welcome.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [done, setDone] = useState(false);
  const submit = useServerFn(submitWaitlist);

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      full_name: "",
      email: "",
      topic: "family-question",
      message: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await submit({
        data: {
          full_name: values.full_name,
          email: values.email,
          role: TOPIC_TO_ROLE[values.topic],
          state: "",
          student_grade_band: "",
          reason: `[${values.topic}] ${values.message}`,
          source: "contact-form",
        },
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <header className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Contact &amp; Help
            </p>
            <h1 className="mt-3 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
              A real person reads every message.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              We're a small pilot team in Connecticut. No ticket queues, no chatbots. Tell us
              what you need — for your student, your classroom, your district, or your program —
              and we'll get back to you within two school days.
            </p>
          </header>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <HelpCard
              icon={<MessageCircle className="h-5 w-5" />}
              title="Families & students"
              body="Stuck on the Pathway Report, the IEP upload, or anything in the Student Hub? We'll walk through it with you."
            />
            <HelpCard
              icon={<LifeBuoy className="h-5 w-5" />}
              title="Educators & districts"
              body="Caseload questions, training requests, CT SEDS alignment, or a 20-minute demo for your team — just ask."
            />
            <HelpCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Accessibility & privacy"
              body="Found a barrier or have a question about how we handle student data? Flag it here and we'll prioritize it."
            />
          </div>

          {!done ? (
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-10 grid gap-5 rounded-3xl border bg-card p-6 shadow-soft md:p-8"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" error={form.formState.errors.full_name?.message}>
                  <Input {...form.register("full_name")} placeholder="First and last name" maxLength={200} />
                </Field>
                <Field label="Email" error={form.formState.errors.email?.message}>
                  <Input
                    type="email"
                    {...form.register("email")}
                    placeholder="you@example.com"
                    maxLength={255}
                  />
                </Field>
              </div>

              <Field label="What is this about?" error={form.formState.errors.topic?.message}>
                <Select
                  defaultValue="family-question"
                  onValueChange={(v) => form.setValue("topic", v as FormValues["topic"])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick the closest fit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family-question">I'm a family member with a question</SelectItem>
                    <SelectItem value="educator-question">I'm an educator / case manager</SelectItem>
                    <SelectItem value="district-demo">School / district demo</SelectItem>
                    <SelectItem value="press-research">Press, research, or partnership</SelectItem>
                    <SelectItem value="accessibility">Accessibility issue or feedback</SelectItem>
                    <SelectItem value="other">Something else</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Your message"
                error={form.formState.errors.message?.message}
              >
                <Textarea
                  rows={6}
                  maxLength={2000}
                  {...form.register("message")}
                  placeholder="Tell us what's happening, what you need, or what you'd like to see. Plain language is best — no special-education jargon required."
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Don't include sensitive student data here. For anything involving a child's
                  records, we'll move to a secure channel once we reply.
                </p>
              </Field>

              <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  By sending this you agree to our{" "}
                  <a href="/privacy" className="underline underline-offset-2">
                    privacy notice
                  </a>
                  .
                </p>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Sending…" : "Send message"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-10 rounded-3xl border bg-card p-8 shadow-soft sm:p-10">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-hero text-primary">
                  <Mail className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h2 className="font-display text-2xl font-medium">
                    Got it. Thank you for reaching out.
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    A real Connecticut human will reply within two school days. If it's urgent,
                    write "urgent" in the subject when you reply to our confirmation and we'll
                    move you to the top of the day.
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <ResultStep
                  n={1}
                  title="Routing"
                  body="We tag your message to the right teammate — family support, educator success, or district lead."
                />
                <ResultStep
                  n={2}
                  title="Reply"
                  body="You'll hear back from a named person, not a queue — usually within 1 school day."
                />
                <ResultStep
                  n={3}
                  title="Next step"
                  body="If we need to discuss a student, we'll move to a secure, FERPA-aware channel first."
                />
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border/60 pt-6">
                <p className="text-sm text-muted-foreground">While you wait:</p>
                <a
                  href="/demo"
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
                >
                  Walk the demo
                </a>
                <a
                  href="/framework"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40"
                >
                  The framework
                </a>
                <a
                  href="/resources"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40"
                >
                  Resource hub
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setDone(false);
                    form.reset();
                  }}
                  className="ml-auto text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Send another message →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

function HelpCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-hero text-primary">
        {icon}
      </span>
      <h3 className="mt-3 font-display text-lg font-medium">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function ResultStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
          {n}
        </span>
        <p className="font-display text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
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
