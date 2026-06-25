import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/value-lens";

interface Props {
  /** The question this step answers, e.g. "What does the student want?" */
  question: string;
  /** One-line story beat, e.g. "Maya's family uploads her IEP…" */
  storyBeat: string;
  /** Inputs the user provides at this step. */
  inputs: string[];
  /** Output TransitionForward returns from this step. */
  output: string;
  /** Roles that benefit most from this step. */
  rolesHelped: AppRole[];
  className?: string;
}

const ROLE_LABEL: Record<AppRole, string> = {
  student: "Student",
  family: "Family",
  educator: "Educator",
  school: "School Admin",
  district: "District Admin",
  partner: "Partner",
  owner: "Owner",
};

/**
 * "In this step" header used at the top of every Demo Workspace step.
 * Makes the planning purpose of each step explicit instead of letting it
 * read like a product screenshot tour.
 */
export function StepValueHeader({
  question,
  storyBeat,
  inputs,
  output,
  rolesHelped,
  className,
}: Props) {
  return (
    <section
      aria-label="In this step"
      className={cn(
        "rounded-2xl border bg-card/60 p-5 shadow-soft sm:p-6",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        In This Step
      </p>
      <h2 className="mt-1 font-display text-xl tracking-tight sm:text-2xl">
        {question}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {storyBeat}
      </p>
      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
        <Cell label="You Provide" value={inputs.join(" · ")} />
        <Cell label="TransitionForward Returns" value={output} />
        <Cell label="Most Helpful For" value={rolesHelped.map((r) => ROLE_LABEL[r]).join(" · ")} />
      </dl>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
        {label}
      </dt>
      <dd className="mt-1 text-foreground/90">{value}</dd>
    </div>
  );
}
