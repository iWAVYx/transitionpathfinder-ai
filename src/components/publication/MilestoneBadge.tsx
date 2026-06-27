/**
 * MilestoneBadge — warm chapter-opener chip that pairs a pathway milestone
 * illustration with its label. Used at the top of demo/report chapter
 * openers so each page is visually recognisable at a glance and the
 * student/family connection between chapters is unmistakable.
 *
 * Sizes:
 *   "sm" — inline chip (next to kickers, in spine updates)
 *   "lg" — full vignette + label block (chapter openers, part dividers)
 */
import type { PathwayMilestoneId } from "@/lib/publication/chapters";
import { PATHWAY_SPINE } from "@/lib/publication/chapters";
import { getMilestoneArt } from "@/lib/publication/milestone-art";

interface Props {
  milestone: PathwayMilestoneId;
  size?: "sm" | "lg";
  /** Optional override for label text. Defaults to the milestone label. */
  label?: string;
  /** When true, only the illustration renders (no text). */
  iconOnly?: boolean;
  className?: string;
  /** Style — "light" for warm paper, "dark" for teal opener backgrounds. */
  tone?: "light" | "dark";
}

export function MilestoneBadge({
  milestone,
  size = "sm",
  label,
  iconOnly,
  className,
  tone = "light",
}: Props) {
  const art = getMilestoneArt(milestone);
  const spine = PATHWAY_SPINE.find((m) => m.id === milestone);
  const text = label ?? spine?.label ?? milestone;
  const isLg = size === "lg";

  const wrap = `milestone-badge milestone-badge--${size} milestone-badge--${tone} ${className ?? ""}`;
  const style = { ["--mb-hue" as string]: art.hue, ["--mb-soft" as string]: art.hueSoft };

  return (
    <span className={wrap} style={style} aria-label={`Pathway milestone: ${text}`}>
      <span className="milestone-badge-art" aria-hidden>
        {isLg ? <art.Vignette /> : <art.Icon size={14} strokeWidth={1.9} />}
      </span>
      {!iconOnly && (
        <span className="milestone-badge-text">
          <span className="milestone-badge-kicker">Pathway · {art.mood}</span>
          <span className="milestone-badge-label">{text}</span>
        </span>
      )}
    </span>
  );
}
