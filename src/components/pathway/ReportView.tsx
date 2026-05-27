import type { PathwayReport } from "@/lib/pathway.functions";
import { Button } from "@/components/ui/button";

export function ReportView({
  name,
  report,
  onReset,
  resetLabel = "Create another report",
}: {
  name: string;
  report: PathwayReport;
  onReset?: () => void;
  resetLabel?: string;
}) {
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
        {onReset && (
          <Button onClick={onReset} variant="outline">{resetLabel}</Button>
        )}
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
