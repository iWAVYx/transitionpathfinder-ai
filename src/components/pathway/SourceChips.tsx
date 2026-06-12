import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SourceRef } from "@/lib/pathway-v2";

const KIND_LABEL: Record<string, string> = {
  profile: "Profile",
  student_voice: "Student Voice",
  iep_doc: "IEP",
  iep_extraction: "IEP extract",
  goal: "Goal",
  readiness: "Readiness",
  action_item: "Action item",
  meeting_prep: "Meeting prep",
  saved_resource: "Saved resource",
  partner_match: "Partner match",
  family_priority: "Family priority",
  educator_input: "Educator input",
};

export function SourceChips({
  sources,
  collapsed = false,
  className,
}: {
  sources: SourceRef[] | undefined;
  collapsed?: boolean;
  className?: string;
}) {
  if (!sources?.length) return null;
  if (collapsed) {
    return (
      <p className={cn("text-[11px] text-muted-foreground", className)}>
        Based on {sources.length} source{sources.length === 1 ? "" : "s"} from this
        student's profile and inputs.
      </p>
    );
  }
  return (
    <ul
      className={cn("flex flex-wrap gap-1.5", className)}
      aria-label="Sources that informed this recommendation"
    >
      {sources.map((s, i) => (
        <li key={`${s.kind}-${s.id ?? i}`}>
          <Badge
            variant="secondary"
            className="text-[10px] font-medium"
            title={s.label}
          >
            <span className="font-semibold uppercase tracking-wider opacity-70">
              {KIND_LABEL[s.kind] ?? s.kind}
            </span>
            <span className="mx-1 opacity-40">·</span>
            <span className="truncate max-w-[18ch]">{s.label}</span>
          </Badge>
        </li>
      ))}
    </ul>
  );
}
