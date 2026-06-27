/**
 * SpineUpdate — small editorial annotation placed at the end of a chapter
 * to make the pathway threading legible in prose:
 *
 *   "Adds to the pathway: Maya's preference for hands-on learning →"
 *
 * Pairs with the visual PathwaySpine in the reader chrome so the user can
 * both see the spine progress and read what this chapter contributed.
 */
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import type { PathwayMilestoneId } from "@/lib/publication/chapters";
import { getMilestoneArt } from "@/lib/publication/milestone-art";

interface Props {
  /** Milestone or stage this chapter feeds into (sentence fragment). */
  feeds: string;
  /** Optional milestone id to render an inline icon + warm accent. */
  milestone?: PathwayMilestoneId;
  /** What this chapter contributed (sentence fragment, no trailing period). */
  children: ReactNode;
}

export function SpineUpdate({ feeds, milestone, children }: Props) {
  const art = milestone ? getMilestoneArt(milestone) : undefined;
  const style = art
    ? ({ ["--spine-update-hue" as string]: art.hue, ["--spine-update-soft" as string]: art.hueSoft } as React.CSSProperties)
    : undefined;
  return (
    <aside className="spine-update" aria-label="Pathway contribution" style={style}>
      {art ? (
        <span className="spine-update-icon" aria-hidden>
          <art.Icon size={14} strokeWidth={2} />
        </span>
      ) : (
        <span className="spine-update-tick" aria-hidden />
      )}
      <span className="spine-update-label">Adds To The Pathway</span>
      <span className="spine-update-body">
        {children} <ArrowRight className="inline h-3.5 w-3.5 -mt-0.5" aria-hidden /> {feeds}
      </span>
    </aside>
  );
}
