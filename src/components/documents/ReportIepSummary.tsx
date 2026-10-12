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
            <div className="flex flex-wrap gap-2">
              {(iep.plan_date_start || iep.plan_date_end) && (
                <Badge variant="outline" className="w-fit text-[11px]">
                  Plan dates: {iep.plan_date_start ?? "—"} → {iep.plan_date_end ?? "—"}
                </Badge>
              )}
            </div>

            {iep.present_levels && (
              <div className="mt-4">
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
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary font-[Urbanist,sans-serif]">
                        {g.area}
                      </p>
                      <p className="mt-1 font-[Instrument_Serif,serif] text-base font-medium">
                        {g.goal_text}
                      </p>
                      {audience !== "educator" && g.plain_language && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          In plain language: {g.plain_language}
                        </p>
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
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-[Urbanist,sans-serif]">
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

