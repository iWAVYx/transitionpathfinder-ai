import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SourceRef } from "@/lib/pathway-v2";

const KIND_LABEL: Record<string, string> = {
  profile: "Profile",
  student_voice: "Student Voice",
  iep_doc: "IEP",
  iep_extraction: "IEP Document Summary",
  goal: "Goal",
  readiness: "Readiness",
  action_item: "Action Item",
  meeting_prep: "Meeting Prep",
  saved_resource: "Saved Resource",
  partner_match: "Partner Match",
  family_priority: "Family Priority",
  educator_input: "Educator Input",
};

export function SourceChips({
  sources,
  collapsed = false,
  sourceCount,
  className,
}: {
  sources: SourceRef[] | undefined;
  collapsed?: boolean;
  sourceCount?: number;
  className?: string;
}) {
  const count = sources?.length || (Number.isInteger(sourceCount) && sourceCount! > 0 ? sourceCount! : 0);
  if (!count) return null;
  if (collapsed || !sources?.length) {
    return (
      <p data-report-source-count className={cn("text-[11px] text-muted-foreground", className)}>
        Information from {count} recorded source{count === 1 ? "" : "s"}.
      </p>
    );
  }
  return (
    <ul
      className={cn("flex flex-wrap gap-1.5 print:block", className)}
      aria-label="Sources that informed this recommendation"
    >
      {sources?.map((s, i) => (
        <li key={`${s.kind}-${s.id ?? i}`} className="min-w-0 max-w-full">
          <Badge
            variant="secondary"
            className="max-w-full text-[10px] font-medium print:block print:whitespace-normal print:border-0 print:bg-transparent print:px-0"
            title={s.label}
          >
            <span className="shrink-0 font-semibold uppercase tracking-wider opacity-70">
              {KIND_LABEL[s.kind] ?? s.kind}
            </span>
            <span className="mx-1 opacity-40">·</span>
            <span className="min-w-0 break-words whitespace-normal print:inline">{s.label}</span>
          </Badge>
        </li>
      ))}
    </ul>
  );
}
