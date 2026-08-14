import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { type HubDefinition, getHub } from "@/lib/hubs/registry";

const HUB_ROUTES = {
  student: "/hubs/student",
  family: "/hubs/family",
  caseload: "/hubs/caseload",
  school: "/hubs/school",
  district: "/hubs/district",
  partner: "/hubs/partner",
  admin: "/hubs/admin",
} as const;

function hubRoute(slug: string) {
  return HUB_ROUTES[slug as keyof typeof HUB_ROUTES] ?? "/hubs/student";
}

/**
 * "No dead ends" rail — every hub renders this so users always know what
 * to explore next. Pulls related hubs from the registry; falls back to
 * a useful default when a hub hasn't declared any.
 */
export function RelatedLinksRail({ hub }: { hub: HubDefinition }) {
  const related = hub.related
    .map((id) => getHub(id))
    .filter((h): h is HubDefinition => Boolean(h));

  return (
    <div className="rounded-3xl border bg-muted/30 p-6 sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        Related Hubs
      </p>
      <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
        Keep Exploring
      </h2>

      {related.length > 0 ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((r) => (
            <li key={r.id}>
              <Link
                to={hubRoute(r.slug)}
                className="group flex items-start gap-3 rounded-2xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-soft"
              >
                <ArrowRight
                  className="mt-1 h-4 w-4 shrink-0 text-primary transition group-hover:translate-x-0.5"
                  aria-hidden
                />
                <div>
                  <p className="font-display text-sm font-medium group-hover:text-primary">
                    {r.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {r.who}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          More hubs coming soon. In the meantime, the{" "}
          <Link to="/resources" className="text-primary underline-offset-2 hover:underline">
            Resource Hub
          </Link>{" "}
          is the best place to keep browsing.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        <Link
          to={hub.nextAction.to}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-semibold text-primary-foreground transition hover:shadow-soft"
        >
          Next Step: {hub.nextAction.label}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
        <Link
          to="/demo/report"
          className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 font-medium text-foreground/80 transition hover:border-primary/40 hover:text-primary"
        >
          Use This In The Pathway Report
        </Link>
        <Link
          to="/resources"
          className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 font-medium text-foreground/80 transition hover:border-primary/40 hover:text-primary"
        >
          Browse All Resources
        </Link>
      </div>
    </div>
  );
}
