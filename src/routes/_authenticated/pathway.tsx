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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createPathwayReport, type PathwayReport } from "@/lib/pathway.functions";

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
        <ReportView name={studentName} report={report} onReset={() => setReport(null)} />
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pathway Builder</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Tell us about your student.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Share what you know — even just a little. We'll turn it into a personalized Pathway
          Report with career directions, life-skills focus, family questions for the next PPT,
          and a 30-day plan. Nothing is shared outside your account.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-10 space-y-5 rounded-3xl border border-border/60 bg-card p-6 shadow-soft sm:p-8">
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
          <Field label="Family concerns / hopes" hint="What keeps you up at night? What do you want for them after high school?">
            <Textarea rows={3} {...form.register("family_concerns")} />
          </Field>
          <Field label="Student's own voice" hint="In their words, if possible: what do they want their team to know?">
            <Textarea rows={3} {...form.register("student_voice")} />
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

function ReportView({ name, report, onReset }: { name: string; report: PathwayReport; onReset: () => void }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-hero p-8 shadow-soft sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pathway Report</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          A plan for {name}.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-foreground/80">{report.summary}</p>
      </div>

      <Block title="Strengths to lead with">
        <BulletList items={report.strengths_snapshot} />
      </Block>

      <Block title="Career pathways to explore">
        <div className="grid gap-4">
          {report.career_pathways.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border/60 bg-card p-5">
              <h3 className="font-display text-xl font-medium">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.why_it_fits}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-primary">Example roles</p>
              <BulletList items={p.example_roles} />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-primary">First steps</p>
              <BulletList items={p.first_steps} />
            </div>
          ))}
        </div>
      </Block>

      <Block title="Education & training options"><BulletList items={report.education_training_options} /></Block>
      <Block title="Life skills to focus on"><BulletList items={report.life_skills_focus} /></Block>
      <Block title="Questions to bring to the next PPT"><BulletList items={report.family_questions_for_ppt} /></Block>
      <Block title="Teacher next steps"><BulletList items={report.teacher_next_steps} /></Block>

      <Block title="A gentle 30-day plan">
        <ol className="space-y-3">
          {report.thirty_day_plan.map((w) => (
            <li key={w.week} className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Week {w.week}</p>
              <p className="mt-1 text-sm text-foreground">{w.action}</p>
            </li>
          ))}
        </ol>
      </Block>

      <div className="mt-10 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">For {name}</p>
        <p className="mt-3 font-display text-xl italic text-foreground/90">{report.encouragement_to_student}</p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button onClick={onReset} variant="outline">Create another report</Button>
        <Button onClick={() => window.print()}>Print / save as PDF</Button>
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="font-display text-2xl font-medium tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
