import { Compass, HelpCircle, ListChecks, Sparkles, BookOpen } from "lucide-react";

import type { ValueCallout as ValueCalloutData } from "@/lib/value-lens";
import { cn } from "@/lib/utils";

interface Props {
  data: ValueCalloutData;
  /** Visual variant — `inline` for report chapters, `card` for dashboards. */
  variant?: "inline" | "card";
  className?: string;
}

const ROW_ICONS = {
  whatThisMeans: Sparkles,
  whyItMatters: Compass,
  recommendedNextStep: ListChecks,
  questionsForTeam: HelpCircle,
  informationUsed: BookOpen,
} as const;

const OWNER_LABEL: Record<NonNullable<ValueCalloutData["owner"]>, string> = {
  student: "Student",
  family: "Family",
  case_manager: "Case Manager",
  school: "School",
  partner: "Partner",
  team: "Whole Team",
};

/**
 * Decision-supportive callout used after report chapters and inside
 * dashboard cards. Renders five labeled rows: What This Means,
 * Why It Matters, Recommended Next Step, Questions To Bring, and
 * Information Used. Tone is warm + plain.
 */
export function ValueCallout({ data, variant = "inline", className }: Props) {
  return (
    <aside
      aria-label="What this means and what to do next"
      className={cn(
        "rounded-2xl border border-primary/15 bg-primary/[0.03] p-5 text-sm leading-relaxed sm:p-6",
        variant === "card" && "shadow-soft",
        className,
      )}
    >
      <Row icon="whatThisMeans" label="What This Means" body={data.whatThisMeans} />
      <Row icon="whyItMatters" label="Why It Matters" body={data.whyItMatters} />
      <Row
        icon="recommendedNextStep"
        label="Recommended Next Step"
        body={
          <>
            {data.recommendedNextStep}
            {(data.owner || data.timeframe) && (
              <span className="ml-2 text-xs text-muted-foreground">
                {data.owner && <>· {OWNER_LABEL[data.owner]}</>}
                {data.timeframe && <> · {data.timeframe}</>}
              </span>
            )}
          </>
        }
      />
      {data.questionsForTeam.length > 0 && (
        <Row
          icon="questionsForTeam"
          label="Questions To Bring To The Team"
          body={
            <ul className="mt-1 list-disc space-y-1 pl-5 marker:text-primary/60">
              {data.questionsForTeam.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          }
        />
      )}
      <Row
        icon="informationUsed"
        label="Information Used"
        body={
          <span className="text-xs text-muted-foreground">
            {data.informationUsed.join(" · ")}
          </span>
        }
        last
      />
    </aside>
  );
}

function Row({
  icon,
  label,
  body,
  last,
}: {
  icon: keyof typeof ROW_ICONS;
  label: string;
  body: React.ReactNode;
  last?: boolean;
}) {
  const Icon = ROW_ICONS[icon];
  return (
    <div
      className={cn(
        "flex gap-3 py-2.5",
        !last && "border-b border-primary/10",
      )}
    >
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {label}
        </p>
        <div className="mt-0.5 text-foreground/90">{body}</div>
      </div>
    </div>
  );
}
