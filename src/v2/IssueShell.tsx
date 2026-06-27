import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { THREAD_STOPS, threadStateFor } from "@/v2/thread";
import type { PathwayMilestoneId } from "@/lib/publication/chapters";
import {
  PUBLICATION_PAGES,
  getPageById,
  prevPage,
  nextPage,
} from "@/lib/publication/nav";

interface Props {
  /** Active milestone (drives the rail). Use "cover" on /demo and "next" on /demo/next. */
  milestone: PathwayMilestoneId | "cover" | "next";
  /** Folio number shown in the foot. Defaults to the page's PUBLICATION_PAGES folio. */
  pageId?: string;
  /** Override the top-bar issue line (e.g. "Cover", "Contents"). */
  partLabel?: string;
  /** Optional evidence-gutter content (quotes, documents, recommendations). */
  evidence?: ReactNode;
  children: ReactNode;
}

/**
 * V2 IssueShell — "Boxed Workspace" presentation.
 *
 * The page is a single contained card sitting on the site background. On the
 * left, a navy command rail holds the brand and a vertical pathway of all
 * milestones (current, passed, and future). On the right, a cream reading
 * deck holds the chapter content, an optional evidence gutter, and a
 * sticky prev/next foot. SiteShell continues to provide the global header,
 * footer, and auth chrome around the workspace.
 */
export function IssueShell({ milestone, pageId, partLabel, evidence, children }: Props) {
  const page = pageId ? getPageById(pageId) : undefined;
  const prev = page ? prevPage(page.id) : undefined;
  const next = page ? nextPage(page.id) : undefined;
  const folio = page?.folio ?? 1;
  const issueDate = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const states = threadStateFor(milestone);
  const activeIdx = states.indexOf("current");
  const overallPct = Math.max(
    0,
    Math.min(100, Math.round(((activeIdx < 0 ? 0 : activeIdx) / (THREAD_STOPS.length - 1)) * 100)),
  );

  return (
    <SiteShell>
      <div className="tf-v2">
        <div className="tf-v2-shell">
          <div className="tf-v2-workspace">
            {/* ---------------- Rail ---------------- */}
            <aside className="tf-v2-rail" aria-label="Pathway navigation">
              <div className="tf-v2-rail-brand">
                <div className="kicker">TransitionForward</div>
                <h1>Demo Workspace</h1>
              </div>

              <nav className="tf-v2-rail-nav">
                <span className="tf-v2-rail-thread" aria-hidden />
                <ol className="tf-v2-rail-list">
                  {THREAD_STOPS.map((stop, i) => {
                    const state = states[i];
                    const num = stop.id === "next" ? "→" : String(i + 1).padStart(2, "0");
                    return (
                      <li key={stop.id}>
                        <Link
                          to={stop.route}
                          className="tf-v2-rail-stop"
                          data-state={state}
                          data-id={stop.id}
                          aria-current={state === "current" ? "step" : undefined}
                        >
                          <span className="dot" aria-hidden />
                          <span className="meta">
                            <span className="num">{num}</span>
                            {stop.label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </nav>

              <div className="tf-v2-rail-foot">
                Pathway Progress · {overallPct}%
              </div>
            </aside>

            {/* ---------------- Deck ---------------- */}
            <section className={`tf-v2-deck ${evidence ? "tf-v2-deck--with-evidence" : ""}`}>
              <div className="tf-v2-deck-topbar">
                <span>{partLabel ?? (page ? page.kicker : "Cover")}</span>
                <span className="vol">Sample Edition · {issueDate}</span>
              </div>

              <div className="tf-v2-deck-body">
                <div className="tf-v2-deck-main">{children}</div>
                {evidence ? (
                  <aside className="tf-v2-evidence" aria-label="Supporting evidence">
                    {evidence}
                  </aside>
                ) : null}
              </div>

              {(prev || next) ? (
                <footer className="tf-v2-deck-foot" aria-label="Page navigation">
                  <div>
                    {prev ? (
                      <Link to={prev.route}>
                        <span className="arrow"><ArrowLeft className="h-3.5 w-3.5" /></span>
                        <span>
                          <span className="lbl">Previous</span>
                          {prev.label}
                        </span>
                      </Link>
                    ) : <span />}
                  </div>
                  <div className="folio">p. {String(folio).padStart(2, "0")}</div>
                  <div className="next">
                    {next ? (
                      <Link to={next.route}>
                        <span style={{ textAlign: "right" }}>
                          <span className="lbl">Next</span>
                          {next.label}
                        </span>
                        <span className="arrow"><ArrowRight className="h-3.5 w-3.5" /></span>
                      </Link>
                    ) : <span />}
                  </div>
                </footer>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

export { PUBLICATION_PAGES };
