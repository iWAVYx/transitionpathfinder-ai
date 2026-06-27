import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import type { HubSpoke } from "@/lib/hubs/registry";
import { FeedsReportBadge } from "./FeedsReportBadge";

export function HubSpokeGrid({ spokes }: { spokes: HubSpoke[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {spokes.map((spoke) => (
        <li key={spoke.id}>
          <Link
            to={spoke.to}
            className="group flex h-full flex-col rounded-2xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-medium tracking-tight group-hover:text-primary">
                {spoke.title}
              </h3>
              <ArrowUpRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              {spoke.description}
            </p>
            {spoke.feedsReport && (
              <div className="mt-4">
                <FeedsReportBadge section={spoke.feedsReport} />
              </div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
