import { Link } from "@tanstack/react-router";
import { THREAD_STOPS, threadStateFor } from "@/v2/thread";
import type { PathwayMilestoneId } from "@/lib/publication/chapters";

interface Props {
  /** Active milestone, or "cover" for the issue cover, or "next" for the closing page. */
  active: PathwayMilestoneId | "cover" | "next";
}

/**
 * V2 Pathway Thread — horizontal milestone nav anchored across the top of
 * every issue page. The active node is enlarged + teal; passed nodes are
 * filled ink; future nodes are outlined. Each stop links to the first page
 * of its milestone.
 */
export function PathwayThread({ active }: Props) {
  const states = threadStateFor(active);
  const activeIdx = states.indexOf("current");
  // Fill from start to active node center, as a percentage of the row.
  const fillPct =
    activeIdx <= 0
      ? 0
      : (activeIdx / (THREAD_STOPS.length - 1)) * 100;

  return (
    <div className="tf-v2-thread-wrap">
      <nav className="tf-v2-thread" aria-label="Pathway progress">
        <span className="tf-v2-thread-rail" aria-hidden />
        <span
          className="tf-v2-thread-fill"
          aria-hidden
          style={{ width: `${fillPct}%` }}
        />
        <ol className="tf-v2-thread-list">
          {THREAD_STOPS.map((stop, i) => (
            <li key={stop.id} style={{ listStyle: "none" }}>
              <Link
                to={stop.route}
                className="tf-v2-thread-node"
                data-state={states[i]}
                aria-current={states[i] === "current" ? "step" : undefined}
              >
                <span className="dot" aria-hidden />
                <span className="lbl">{stop.label}</span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
