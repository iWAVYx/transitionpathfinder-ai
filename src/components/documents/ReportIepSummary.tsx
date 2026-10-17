import { ReportGoalHeading } from "./ReportGoalHeading";
import { ReportGoalFact } from "./ReportGoalFact";
import { Badge } from "@/components/ui/badge";
import { PublicationPage } from "@/components/publication/PublicationPage";
import type { IepPlanSummary } from "@/lib/pathway-v2";

/** Render only supplied plan fields, with the existing audience-specific wording. */
export function ReportIepSummary({ iep, audience }: { iep: IepPlanSummary; audience: "student" | "family" | "educator" }) {
  return (
        <PublicationPage
          headingLevel="h2"
          chapter="IEP / Transition Plan Summary"
          dek={
            iep.caveats ??
            "This summary reflects information recorded in this report. Compare it with the source plan before agreeing on goals or supports."
          }
        >
          <section id="v2-iep-summary">
            <style>{`@media print {
              [data-report-iep-present-levels] > h3,
              [data-report-iep-present-levels] > hr {
                break-after: avoid; page-break-after: avoid;
              }
            }`}</style>
            <div className="flex flex-wrap gap-2">
              {(iep.plan_date_start || iep.plan_date_end) && (
                <Badge variant="outline" className="w-fit text-[11px]">
                  Plan dates: {iep.plan_date_start ?? "—"} → {iep.plan_date_end ?? "—"}
                </Badge>
              )}
            </div>

            {iep.present_levels && (
              <div data-report-iep-present-levels className="mt-4">
                <h3 className="font-display text-lg">Present Levels</h3>
                <hr className="my-2 border-t border-[color:var(--pub-rule-soft)]" />
                <p className="text-sm whitespace-pre-wrap">{iep.present_levels}</p>
              </div>
            )}

            {iep.transition_goals?.length > 0 && (
              <div className="mt-6">
                <h3 className="font-display text-lg">Transition Goals</h3>
                <hr className="my-2 border-t border-[color:var(--pub-rule-soft)]" />
                <ul>
                  {iep.transition_goals.map((g, i) => (
                    <li
                      key={i}
                      className="border-b border-[color:var(--pub-rule-soft)] py-4 last:border-b-0"
                    >
                      <ReportGoalHeading as="h4" title={g.area} />
                      <p data-report-recorded-goal-title className="mt-1 text-sm font-medium">
                        {g.goal_text}
                      </p>
                      {audience !== "educator" && g.plain_language && (
                        <ReportGoalFact label="In Plain Language">{g.plain_language}</ReportGoalFact>
                      )}
                      {g.related_services?.length ? (
                        <ul className="mt-2 flex flex-wrap gap-1">
                          {g.related_services.map((s) => (
                            <li key={s}>
                              <Badge variant="secondary" className="text-[10px]">
                                {s}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(iep.accommodations?.length || iep.services?.length) ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ChipList label="Accommodations" items={iep.accommodations} />
                <ChipList label="Services" items={iep.services} />
              </div>
            ) : null}
          </section>
        </PublicationPage>
      );
}

function ChipList({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p data-document-subheading className="text-xs font-semibold text-foreground">
        {label}
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((t) => (
          <li key={t}>
            <Badge variant="secondary" className="text-[10px]">
              {t}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

