import { createFileRoute, Link } from "@tanstack/react-router";
import { DEMO_FEATURE_MAP, type DemoElementId } from "@/lib/demo/feature-map";

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
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Internal audit · not linked from marketing nav</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Demo Feature Connection Checklist</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Every public <code>/demo</code> element below maps to a real product
          feature. Use this table to confirm the demo accurately mirrors the
          signed-in product and that nothing overpromises.
        </p>
        <p className="mt-2 text-sm">
          <Link to="/demo" className="underline">Back to the demo overview</Link>
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border">
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
    </main>
  );
}
