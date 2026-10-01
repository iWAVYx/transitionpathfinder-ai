import type { DemoProfile } from "@/lib/demo/demo-profiles";
import { generatePathwayReport } from "@/lib/demo/pathway-engine";

const TIMEFRAME = {
  this_month: "This month",
  this_semester: "This semester",
  this_year: "This year",
};

/** The same sample engine output as the report, narrowed to the viewer's responsibilities. */
export function DemoPlanningActions({
  profile,
  audience,
}: {
  profile: DemoProfile;
  audience: "student" | "family" | "educator";
}) {
  const owner = audience === "educator" ? "school_team" : audience;
  const steps = generatePathwayReport(profile).nextSteps.filter(
    (step) => step.owner === owner || step.owner === "shared",
  );
  return (
    <section
      className="rounded-2xl border bg-card p-5"
      aria-label={`Sample next steps for ${profile.shortName}`}
    >
      <h2 className="font-display text-xl">{profile.shortName}'s sample next steps</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        From the prepared sample report. These are examples to discuss, not saved tasks or agreed
        deadlines.
      </p>
      <ul className="mt-4 divide-y">
        {steps.map((step) => (
          <li key={step.id} className="py-3">
            <h3 className="text-sm font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {TIMEFRAME[step.timeframe]} ·{" "}
              {step.owner === "shared"
                ? "Shared with the team"
                : audience === "educator"
                  ? "School team"
                  : audience === "family"
                    ? "Family"
                    : "Student"}{" "}
              · Review in {step.reviewByMonths} {step.reviewByMonths === 1 ? "month" : "months"}
            </p>
          </li>
        ))}
      </ul>
      {!steps.length && (
        <p className="mt-3 text-sm">No sample actions assigned to this perspective.</p>
      )}
    </section>
  );
}
