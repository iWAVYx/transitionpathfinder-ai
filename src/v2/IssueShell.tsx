import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { PathwayThread } from "@/v2/PathwayThread";
import type { PathwayMilestoneId } from "@/lib/publication/chapters";
import {
  PUBLICATION_PAGES,
  getPageById,
  prevPage,
  nextPage,
} from "@/lib/publication/nav";

interface Props {
  /** Active milestone (drives the thread). Use "cover" on /demo and "next" on /demo/next. */
  milestone: PathwayMilestoneId | "cover" | "next";
  /** Folio number shown in the foot. Defaults to the page's PUBLICATION_PAGES folio. */
  pageId?: string;
  /** Override the issue line (e.g. "Welcome", "Contents"). */
  partLabel?: string;
  children: ReactNode;
}

/**
 * V2 IssueShell — the contained "publication" frame around every page in the
 * Demo Workspace and (next pass) the signed-in Pathway Report:
 *   • Masthead (TransitionForward · Pathway Issue · edition)
 *   • Horizontal pathway thread
 *   • Reading canvas
 *   • Folio + prev / next page foot
 *
 * SiteShell is preserved underneath so global header/footer, auth chrome,
 * and routing protections continue to work unchanged.
 */
export function IssueShell({ milestone, pageId, partLabel, children }: Props) {
  const page = pageId ? getPageById(pageId) : undefined;
  const prev = page ? prevPage(page.id) : undefined;
  const next = page ? nextPage(page.id) : undefined;
  const folio = page?.folio ?? 1;
  const issueDate = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <SiteShell>
      <div className="tf-v2">
        <div className="tf-v2-frame">
          <header className="tf-v2-masthead">
            <span>
              TransitionForward &middot; Pathway Issue &middot; Sample Edition · {issueDate}
            </span>
            <span className="vol">
              {partLabel ?? (page ? page.kicker : "Cover")}
            </span>
          </header>

          <PathwayThread active={milestone} />

          {children}

          {(prev || next) && (
            <footer className="tf-v2-foot" aria-label="Page navigation">
              <div>
                {prev ? (
                  <Link to={prev.route}>
                    <ArrowLeft className="h-3.5 w-3.5" />
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
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : <span />}
              </div>
            </footer>
          )}
        </div>
      </div>
    </SiteShell>
  );
}

export { PUBLICATION_PAGES };
