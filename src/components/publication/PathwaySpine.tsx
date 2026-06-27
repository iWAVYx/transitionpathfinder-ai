/**
 * PathwaySpine — the visible thread that runs across the top of every
 * publication page (Demo Workspace + signed-in Pathway Report).
 *
 * Renders the eight pathway milestones as a horizontal rail. Nodes up to
 * and including the active milestone are "lit"; subsequent nodes are quiet.
 *
 * Each milestone is interactive: when a `resolveHref` or `onSelect` is
 * provided, the dot becomes a clickable link / button that jumps to the
 * first page (or section) of that planning stage. This makes the spine
 * function as both a progress indicator and a content-aware timeline.
 */
import { Link } from "@tanstack/react-router";
import { PATHWAY_SPINE, type PathwayMilestoneId, milestoneIndex } from "@/lib/publication/chapters";
import { getMilestoneArt } from "@/lib/publication/milestone-art";

interface Props {
  active: PathwayMilestoneId;
  /** Optional title — defaults to "The Pathway". */
  title?: string;
  /**
   * Resolve a milestone -> destination route. When provided, the milestone
   * dot becomes a `<Link>` to that route. Return undefined to render a
   * non-navigable dot for that milestone.
   */
  resolveHref?: (m: PathwayMilestoneId) => string | undefined;
  /**
   * Alternative to `resolveHref`: imperative handler invoked on click.
   * Used by the in-report pager to scroll the section into view.
   */
  onSelect?: (m: PathwayMilestoneId) => void;
  /** Optional search params forwarded to milestone <Link>s. */
  search?: Record<string, unknown>;
}

export function PathwaySpine({ active, title = "The Pathway", resolveHref, onSelect, search }: Props) {
  const activeIdx = Math.max(0, milestoneIndex(active));

  return (
    <div
      className="pathway-spine"
      role="img"
      aria-label={`Pathway progress: ${PATHWAY_SPINE[activeIdx]?.label}`}
    >
      <p className="pathway-spine-eyebrow">
        <span aria-hidden>◆</span> {title}
      </p>
      <ol className="pathway-spine-rail">
        {PATHWAY_SPINE.map((m, i) => {
          const state = i < activeIdx ? "done" : i === activeIdx ? "now" : "ahead";
          const art = getMilestoneArt(m.id);
          const href = resolveHref?.(m.id);
          const interactive = !!href || !!onSelect;
          const content = (
            <>
              <span className="pathway-spine-dot" aria-hidden>
                <art.Icon size={11} strokeWidth={2.1} className="pathway-spine-icon" />
              </span>
              <span className="pathway-spine-label">{m.label}</span>
              <span className="pathway-spine-tip" role="tooltip">{m.contribution}</span>
            </>
          );
          const cls = `pathway-spine-node is-${state}${interactive ? " is-link" : ""}`;
          const style = {
            ["--node-hue" as string]: art.hue,
            ["--node-soft" as string]: art.hueSoft,
          };

          if (href) {
            return (
              <li key={m.id} className={cls} style={style}>
                <Link
                  to={href}
                  search={search as never}
                  className="pathway-spine-trigger"
                  aria-label={`Jump to ${m.label}: ${m.contribution}`}
                  aria-current={state === "now" ? "step" : undefined}
                >
                  {content}
                </Link>
              </li>
            );
          }
          if (onSelect) {
            return (
              <li key={m.id} className={cls} style={style}>
                <button
                  type="button"
                  onClick={() => onSelect(m.id)}
                  className="pathway-spine-trigger"
                  aria-label={`Jump to ${m.label}: ${m.contribution}`}
                  aria-current={state === "now" ? "step" : undefined}
                >
                  {content}
                </button>
              </li>
            );
          }
          return (
            <li key={m.id} className={cls} style={style}>
              {content}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
