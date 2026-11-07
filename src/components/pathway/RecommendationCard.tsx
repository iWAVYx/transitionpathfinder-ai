import { ReportPathwayHeading, ReportPathwaySummary } from "@/components/documents/ReportPathwayIntro";
import { ReportExpandableDetails } from "@/components/documents/ReportExpandableDetails";
import type { ReportSourceCount } from "@/lib/report-source-summary";
import { CalendarClock, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SourceChips } from "@/components/pathway/SourceChips";
import type { PillarRec } from "@/lib/pathway-v2";

const OWNER_LABEL: Record<string, string> = {
  student: "Student",
  family: "Family",
  case_manager: "Case manager",
  educator: "Educator",
  school_team: "School team",
  partner: "Partner organization",
  outside_provider: "Outside provider",
};

const TIMEFRAME_LABEL: Record<string, string> = {
  "30_day": "Next 30 days",
  "90_day": "Next 90 days",
  "6_month": "Next 6 months",
  "1_year": "Next year",
};

export function RecommendationCard({
  rec,
  audience,
  defaultOpen = false,
}: {
  rec: PillarRec & ReportSourceCount;
  audience: "student" | "family" | "educator";
  defaultOpen?: boolean;
}) {
  return (
    <article data-report-recommendation className="rounded-2xl border bg-card p-4 shadow-soft transition-colors hover:border-primary/40 sm:p-5">
      <ReportPathwayHeading as="header" title={rec.title} badges={<>
          {rec.timeframe && (
            <Badge variant="outline" className="text-[10px]">
              <CalendarClock className="print:hidden h-3 w-3" />
              {TIMEFRAME_LABEL[rec.timeframe]}
            </Badge>
          )}
          {rec.discuss_at_next_meeting && (
            <Badge className="text-[10px]" variant="default">
              Discuss at next meeting
            </Badge>
          )}
      </>} />

      <ReportPathwaySummary kind="summary">{rec.summary}</ReportPathwaySummary>

      <ReportExpandableDetails kind="recommendation" audience={audience} defaultOpen={defaultOpen}
        className="mt-3 space-y-3 rounded-xl border border-dashed bg-background/60 p-3 sm:p-4">
          <div data-report-recommendation-field="why">
            <p className="text-xs font-semibold text-foreground">
              Why This Fits
            </p>
            <p className="mt-1 text-sm">{rec.why}</p>
          </div>
          {audience !== "student" && (rec.sources.length > 0 || (rec.source_count ?? 0) > 0) && (
            <div data-report-recommendation-field="sources">
              <p className="text-xs font-semibold text-foreground">
                Information Used
              </p>
              <SourceChips
                sources={rec.sources}
                sourceCount={rec.source_count}
                collapsed={audience === "family"}
                className="mt-1"
              />
            </div>
          )}
          <div data-report-recommendation-field="next">
            <p className="text-xs font-semibold text-foreground">
              Next Step
            </p>
            <p className="mt-1 text-sm">{rec.next_action}</p>
          </div>
          <div data-report-recommendation-field="owner" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <UserRound className="h-3.5 w-3.5" />
            <span>
              Follow-up: <strong className="text-foreground">{OWNER_LABEL[rec.owner_role] ?? rec.owner_role}</strong>
            </span>
          </div>
      </ReportExpandableDetails>
    </article>
  );
}
