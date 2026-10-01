import { Link } from "@tanstack/react-router";
import pathwayHero from "@/assets/pathway-hero.jpg";
import { STEPS, stepHeading, stepSubhead } from "./PathwayBuilderSteps";
import type { PathwayIntakeFormValues } from "@/lib/pathway-intake";

export const PATHWAY_FORM_CLASS =
  "mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-soft sm:p-8";
export function PathwayBuilderHeader({
  step,
  role,
  demo = false,
}: {
  step: number;
  role: PathwayIntakeFormValues["submitter_role"];
  demo?: boolean;
}) {
  const progressPct = Math.round((step / STEPS.length) * 100);
  return (
    <div className="tf-cover relative mt-5 overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
        <img
          src={pathwayHero}
          alt=""
          aria-hidden
          width={1600}
          height={900}
          className="h-full w-full object-cover opacity-70 [mask-image:linear-gradient(to_right,transparent,black_45%)]"
        />
      </div>
      <div className="relative">
        <p className="tf-eyebrow">
          Pathway Builder {demo ? "· Sample only " : ""}· Step {step + 1} of {STEPS.length} ·{" "}
          {progressPct}% Complete
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
          {stepHeading(step, role)}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {stepSubhead(step, demo)}{" "}
          <Link
            to={demo ? "/demo/report" : "/reports"}
            search={demo ? { example: "builder", role } : undefined}
            className="font-semibold text-foreground hover:underline"
          >
            {demo ? "See the prepared sample report →" : "See your saved reports →"}
          </Link>
        </p>
      </div>
    </div>
  );
}
