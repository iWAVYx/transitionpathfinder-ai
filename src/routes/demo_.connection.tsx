import { createFileRoute, Link } from "@tanstack/react-router";
import { DEMO_FEATURE_MAP, type DemoElementId } from "@/lib/demo/feature-map";
import { SiteShell } from "@/components/site/SiteShell";
import { DemoRoleLens } from "@/components/demo/DemoRoleLens";
import {
  PublicationPage,
  PublicationCallout,
} from "@/components/publication/PublicationPage";

export const Route = createFileRoute("/demo_/connection")({
  head: () => ({
    meta: [
      { title: "Demo Feature Connection Checklist — TransitionForward" },
      {
        name: "description",
        content:
          "Internal audit page mapping every public /demo element to its real TransitionForward product feature, route, role, and status.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoConnectionPage,
});

const STATUS_CLASS: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  partial: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "future-phase": "bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

function DemoConnectionPage() {
  const ids = Object.keys(DEMO_FEATURE_MAP) as DemoElementId[];
  return (
    <SiteShell>
      <div className="demo-shell eh-issue">
        <PublicationPage
          kicker="Internal · Audit"
          chapter="Demo Feature Connection Checklist"
          dek="Every public /demo element mapped to its real product feature, route, role, and status."
          folio="internal"
        >
          <PublicationCallout kind="source" title="Internal Audit — Not Linked From Nav">
            This page is noindexed and not linked from the marketing navigation. Use it
            to confirm the demo accurately mirrors the signed-in product and that nothing
            overpromises.
          </PublicationCallout>

          <p className="text-sm mb-4">
            <Link to="/demo" className="underline">← Back to the demo overview</Link>
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Demo element</th>
                  <th className="px-3 py-2 font-semibold">Product feature</th>
                  <th className="px-3 py-2 font-semibold">Lives at</th>
                  <th className="px-3 py-2 font-semibold">Roles</th>
                  <th className="px-3 py-2 font-semibold">Data source</th>
                  <th className="px-3 py-2 font-semibold">Next action</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {ids.map((id) => {
                  const entry = DEMO_FEATURE_MAP[id];
                  return (
                    <tr key={id} className="border-t align-top">
                      <td className="px-3 py-2 font-medium">{entry.element}</td>
                      <td className="px-3 py-2 text-muted-foreground">{entry.product}</td>
                      <td className="px-3 py-2 font-mono text-xs">{entry.livesAt}</td>
                      <td className="px-3 py-2 text-xs">{entry.roles.join(", ")}</td>
                      <td className="px-3 py-2 text-xs">{entry.dataSource}</td>
                      <td className="px-3 py-2 text-xs">{entry.nextAction}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[entry.status]}`}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PublicationPage>
      </div>
    </SiteShell>
  );
}
