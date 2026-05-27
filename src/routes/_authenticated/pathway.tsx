import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { InfoBox } from "@/components/site/InfoBox";
import { FormProgress } from "@/components/pathway/FormProgress";
import { ReportView } from "@/components/pathway/ReportView";
import { IepUpload } from "@/components/pathway/IepUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createPathwayReport, type PathwayReport } from "@/lib/pathway.functions";
import type { IepExtract } from "@/lib/iep-extract.functions";
import pathwayHero from "@/assets/pathway-hero.jpg";

const Schema = z.object({
  submitter_role: z.enum(["family", "student", "educator"]),
  student_first_name: z.string().trim().min(1, "Required").max(80),
  grade_band: z.enum(["9-10", "11-12", "post-secondary", "not-applicable"]).optional(),
  strengths: z.string().trim().max(2000).optional(),
  interests: z.string().trim().max(2000).optional(),
  needs: z.string().trim().max(2000).optional(),
  supports: z.string().trim().max(2000).optional(),
  transportation: z.string().trim().max(500).optional(),
  communication: z.string().trim().max(500).optional(),
  current_goals: z.string().trim().max(2000).optional(),
  family_concerns: z.string().trim().max(2000).optional(),
  student_voice: z.string().trim().max(2000).optional(),
  family_voice: z.string().trim().max(2000).optional(),
  educator_input: z.string().trim().max(2000).optional(),
});
type FormValues = z.infer<typeof Schema>;

export const Route = createFileRoute("/_authenticated/pathway")({
  head: () => ({
    meta: [{ title: "Create a Pathway Report — TransitionForward" }],
  }),
  component: PathwayPage,
});

function PathwayPage() {
  const generate = useServerFn(createPathwayReport);
  const navigate = useNavigate();
  const [report, setReport] = useState<PathwayReport | null>(null);
  const [studentName, setStudentName] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      submitter_role: "family",
      student_first_name: "",
      grade_band: undefined,
      strengths: "",
      interests: "",
      needs: "",
      supports: "",
      transportation: "",
      communication: "",
      current_goals: "",
      family_concerns: "",
      student_voice: "",
      family_voice: "",
      educator_input: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await generate({ data: values });
      setReport(res.report);
      setStudentName(values.student_first_name);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (report) {
    return (
      <SiteShell>
        <ReportView
          name={studentName}
          report={report}
          onReset={() => navigate({ to: "/reports" })}
          resetLabel="See all my reports"
        />
      </SiteShell>
    );
  }

  const applyExtract = (e: IepExtract) => {
    const fields: Array<keyof FormValues> = [
      "student_first_name", "strengths", "interests", "needs", "supports",
      "transportation", "communication", "current_goals", "family_concerns",
      "student_voice", "educator_input",
    ];
    for (const k of fields) {
      const v = (e as Record<string, string>)[k];
      if (v && v.trim()) form.setValue(k, v, { shouldDirty: true, shouldValidate: false });
    }
    if (e.grade_band) {
      form.setValue("grade_band", e.grade_band as FormValues["grade_band"]);
    }
    document.getElementById("intake-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-80" />
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 md:block">
          <img
            src={pathwayHero}
            alt=""
            aria-hidden
            width={1600}
            height={900}
            className="h-full w-full object-cover opacity-90 [mask-image:linear-gradient(to_right,transparent,black_35%)]"
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <Breadcrumbs trail={[{ label: "Pathway Builder" }]} />
        </div>
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pathway Builder</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Tell us about your student.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Share what you know — even just a little. Student, family, and educator voices all in one
            place. Or upload an existing IEP and we'll fill in what we can find.{" "}
            <Link to="/reports" className="font-semibold text-foreground hover:underline">
              See your saved reports →
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="-mt-2 mb-8">
          <IepUpload onExtracted={applyExtract} />
        </div>

        <form id="intake-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 rounded-3xl border border-border/60 bg-card p-6 shadow-soft sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="I am a…">
              <Select
                defaultValue="family"
                onValueChange={(v) => form.setValue("submitter_role", v as FormValues["submitter_role"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">Parent / caregiver</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="educator">Educator / case manager</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Student's first name" error={form.formState.errors.student_first_name?.message}>
              <Input {...form.register("student_first_name")} placeholder="First name only" />
            </Field>
          </div>

          <Field label="Grade band">
            <Select onValueChange={(v) => form.setValue("grade_band", v as FormValues["grade_band"])}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="9-10">9th – 10th</SelectItem>
                <SelectItem value="11-12">11th – 12th</SelectItem>
                <SelectItem value="post-secondary">Post-secondary (18–21)</SelectItem>
                <SelectItem value="not-applicable">Not applicable</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <SectionHeading>The student</SectionHeading>
          <Field label="Strengths" hint="What is this student genuinely good at?">
            <Textarea rows={3} {...form.register("strengths")} />
          </Field>
          <Field label="Interests" hint="What do they care about, talk about, or light up around?">
            <Textarea rows={3} {...form.register("interests")} />
          </Field>
          <Field label="Disability-related needs" hint="What gets in the way? What's hard at school or in the world?">
            <Textarea rows={3} {...form.register("needs")} />
          </Field>
          <Field label="Supports that work" hint="Accommodations, routines, people, or tools that help them succeed.">
            <Textarea rows={3} {...form.register("supports")} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Transportation"><Input {...form.register("transportation")} placeholder="e.g. bus, family drives, learning to drive" /></Field>
            <Field label="Communication"><Input {...form.register("communication")} placeholder="e.g. verbal, AAC, written, prefers text" /></Field>
          </div>

          <Field label="Current IEP transition goals" hint="Paste them in if you have them — even partial is fine.">
            <Textarea rows={3} {...form.register("current_goals")} />
          </Field>

          <SectionHeading>Three voices</SectionHeading>
          <p className="-mt-2 text-xs text-muted-foreground">
            Fill in what you can. The more voices you include, the more grounded the report.
          </p>

          <Field label="Student's voice" hint="In their words, if possible: what do they want their team to know?">
            <Textarea rows={3} {...form.register("student_voice")} />
          </Field>
          <Field label="Family voice" hint="What does the family want the team to know? Hopes, worries, what's worked at home.">
            <Textarea rows={3} {...form.register("family_voice")} />
          </Field>
          <Field label="Educator / case manager input" hint="What is the school team seeing? Progress, sticking points, what they'd recommend.">
            <Textarea rows={3} {...form.register("educator_input")} />
          </Field>
          <Field label="Family concerns / hopes (optional)" hint="Anything else keeping you up at night, or any specific hope for after high school?">
            <Textarea rows={2} {...form.register("family_concerns")} />
          </Field>

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? "Generating your Pathway Report…" : "Generate Pathway Report"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Generation usually takes 15–30 seconds. The AI drafts; you stay in charge.
          </p>
        </form>
      </section>
    </SiteShell>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 inline-block">{label}</Label>
      {hint && <p className="mb-1.5 text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-4 border-t border-border/60 pt-6 font-display text-xl font-medium tracking-tight">
      {children}
    </h2>
  );
}
