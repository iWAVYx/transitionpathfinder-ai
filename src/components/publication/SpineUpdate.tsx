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

interface Props {
  /** Milestone or stage this chapter feeds into (sentence fragment). */
  feeds: string;
  /** What this chapter contributed (sentence fragment, no trailing period). */
  children: ReactNode;
}

export function SpineUpdate({ feeds, children }: Props) {
  return (
    <aside className="spine-update" aria-label="Pathway contribution">
      <span className="spine-update-tick" aria-hidden />
      <span className="spine-update-label">Adds To The Pathway</span>
      <span className="spine-update-body">
        {children} <ArrowRight className="inline h-3.5 w-3.5 -mt-0.5" aria-hidden /> {feeds}
      </span>
    </aside>
  );
}
