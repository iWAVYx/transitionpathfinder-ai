import { useNavigationOrigin } from "@/components/navigation/NavigationOriginProvider";
import { isDashboardHomeDestination } from "@/components/dashboard/dashboard-return-context";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { toTitleCase } from "@/lib/title-case";

export type Crumb = { label: string; to?: string };

/** Explicit page hierarchy only; a Home link is never added automatically. */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const origin = useNavigationOrigin();
  const sourcePath = origin?.to.split(/[?#]/)[0];
  const filtered = trail.filter(c => {
    const path = c.to?.split(/[?#]/)[0];
    const dashboard = path && (isDashboardHomeDestination(path) ||
      /^\/demo\/(?:dashboard|student|family|educator|school-admin|district-admin|partner|owner)$/.test(path));
    return path !== "/" && !(sourcePath && dashboard && path !== sourcePath);
  });
  return (
    <nav aria-label="Breadcrumb" className="text-xs sm:text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-foreground/75">
        {filtered.map((c, i) => {
          const last = i === filtered.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />}
              {last || !c.to ? (
                <span aria-current={last ? "page" : undefined} className="font-medium text-foreground">
                  {toTitleCase(c.label)}
                </span>
              ) : (
                <Link
                  to={c.to as never}
                  className="rounded-full px-2 py-1 hover:bg-muted hover:text-foreground"
                >
                  {toTitleCase(c.label)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
