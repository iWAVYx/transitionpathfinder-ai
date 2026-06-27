/**
 * PathwaySpine — the visible thread that runs across the top of every
 * publication page (Demo Workspace + signed-in Pathway Report).
 *
 * It renders the eight pathway milestones as a horizontal rail with hairline
 * connectors. Nodes up to and including the active milestone are "lit"
 * (filled, ink color); subsequent nodes are quiet (hairline outline).
 *
 * Purpose: make the planning flow legible. The user can see at any moment
 * which inputs have already contributed to the pathway and which are still
 * ahead — turning the publication from a stack of pages into a visible
 * journey from input to insight to action.
 *
 * Pure presentation. Visual styles live in the ISSUE SYSTEM CSS layer in
 * src/styles.css, scoped to `.eh-issue`.
 */
import { PATHWAY_SPINE, type PathwayMilestoneId, milestoneIndex } from "@/lib/publication/chapters";

interface Props {
  active: PathwayMilestoneId;
  /** Optional title — defaults to "The Pathway". */
  title?: string;
}

export function PathwaySpine({ active, title = "The Pathway" }: Props) {
  const activeIdx = Math.max(0, milestoneIndex(active));

  return (
    <div className="pathway-spine" role="img" aria-label={`Pathway progress: ${PATHWAY_SPINE[activeIdx]?.label}`}>
      <p className="pathway-spine-eyebrow">
        <span aria-hidden>◆</span> {title}
      </p>
      <ol className="pathway-spine-rail">
        {PATHWAY_SPINE.map((m, i) => {
          const state = i < activeIdx ? "done" : i === activeIdx ? "now" : "ahead";
          return (
            <li key={m.id} className={`pathway-spine-node is-${state}`}>
              <span className="pathway-spine-dot" aria-hidden />
              <span className="pathway-spine-label">{m.label}</span>
              <span className="pathway-spine-tip" role="tooltip">{m.contribution}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
