import type { ExtendedPlans, PlanHorizon, RichPlanStep } from "@/lib/demo-extended-plans";

/** Keep all supplied periods. Only a complete identical step already printed
 * in an earlier period is omitted; differing owner/details/outcome stay intact.
 */
export function reportPrintPlans(plans: ExtendedPlans) {
  const seen = new Set<string>();
  return (["thirty", "sixty", "ninety"] as const).map((horizon: PlanHorizon) => ({
    horizon,
    steps: plans[horizon].filter((step: RichPlanStep) => {
      const key = JSON.stringify({ week: step.week, focus: step.focus, action: step.action,
        owner: step.owner, time: step.time, details: step.details, outcome: step.outcome,
        familyActions: step.familyActions, teacherActions: step.teacherActions, readiness: step.readiness,
      });
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  }));
}
