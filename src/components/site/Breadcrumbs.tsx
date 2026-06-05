import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { toTitleCase } from "@/lib/title-case";

export type Crumb = { label: string; to?: string };

/**
 * Lightweight breadcrumbs for authenticated pages.
 * Always starts with a Home icon linking to /dashboard.
 * Last crumb is rendered as plain text (current page).
 */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs sm:text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        <li>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-muted hover:text-foreground"
            aria-label="Dashboard home"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">Dashboard</span>
          </Link>
        </li>
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
              {last || !c.to ? (
                <span aria-current={last ? "page" : undefined} className="font-medium text-foreground">
                  {c.label}
                </span>
              ) : (
                <Link
                  to={c.to as never}
                  className="rounded-full px-2 py-1 hover:bg-muted hover:text-foreground"
                >
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
