import { Eye, Lock, Users, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Visibility = "private" | "team" | "family" | "public";

const META: Record<
  Visibility,
  { label: string; Icon: typeof Eye; cls: string; hint: string }
> = {
  private: {
    label: "Private",
    Icon: Lock,
    cls: "bg-muted text-muted-foreground",
    hint: "Only you can see this.",
  },
  team: {
    label: "Team",
    Icon: Users,
    cls: "bg-primary/10 text-primary",
    hint: "Visible to invited educators and coordinators.",
  },
  family: {
    label: "Family",
    Icon: Eye,
    cls: "bg-sky-soft text-ink",
    hint: "Visible to the student's caregivers and invited family.",
  },
  public: {
    label: "Shared Link",
    Icon: Globe2,
    cls: "bg-amber-100 text-amber-900",
    hint: "Anyone with the share link can view.",
  },
};

export function VisibilityBadge({
  visibility,
  className,
}: {
  visibility: Visibility;
  className?: string;
}) {
  const m = META[visibility];
  return (
    <span
      title={m.hint}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        m.cls,
        className,
      )}
    >
      <m.Icon className="h-3 w-3" aria-hidden />
      {m.label}
    </span>
  );
}

export function PermissionLabel({
  can,
  className,
}: {
  can: Array<"view" | "comment" | "edit" | "share" | "manage">;
  className?: string;
}) {
  if (can.length === 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground",
        className,
      )}
      title={`You can: ${can.join(", ")}`}
    >
      You can {can.join(" · ")}
    </span>
  );
}
