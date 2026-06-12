import { ChevronDown, CalendarClock, UserRound } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  rec: PillarRec;
  audience: "student" | "family" | "educator";
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || audience === "educator");
  return (
    <article className="rounded-2xl border bg-card p-4 shadow-soft transition-colors hover:border-primary/40 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-semibold sm:text-base">{rec.title}</h4>
        <div className="flex flex-wrap gap-1.5">
          {rec.timeframe && (
            <Badge variant="outline" className="text-[10px]">
              <CalendarClock className="h-3 w-3" />
              {TIMEFRAME_LABEL[rec.timeframe]}
            </Badge>
          )}
          {rec.discuss_at_next_meeting && (
            <Badge className="text-[10px]" variant="default">
              Discuss at next meeting
            </Badge>
          )}
        </div>
      </header>

      <p className="mt-2 text-sm text-foreground/90">{rec.summary}</p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        aria-expanded={open}
      >
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
        {open ? "Hide rationale" : "Why this · what's next · who"}
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-xl border border-dashed bg-background/60 p-3 sm:p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Why this was recommended
            </p>
            <p className="mt-1 text-sm">{rec.why}</p>
          </div>
          {audience !== "student" && rec.sources.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                What informed this
              </p>
              <SourceChips
                sources={rec.sources}
                collapsed={audience === "family"}
                className="mt-1"
              />
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Next action
            </p>
            <p className="mt-1 text-sm">{rec.next_action}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <UserRound className="h-3.5 w-3.5" />
            <span>
              Follow-up: <strong className="text-foreground">{OWNER_LABEL[rec.owner_role] ?? rec.owner_role}</strong>
            </span>
          </div>
        </div>
      )}
    </article>
  );
}
