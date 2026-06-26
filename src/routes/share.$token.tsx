import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { SiteShell } from "@/components/site/SiteShell";
import { ReportView } from "@/components/pathway/ReportView";
import { ReportChapterPager } from "@/components/pathway/ReportChapterPager";
import { resolveShareToken } from "@/lib/share.functions";
import type { PathwayReport } from "@/lib/pathway.functions";

export const Route = createFileRoute("/share/$token")({
  head: () => ({
    meta: [
      { title: "Shared Pathway Report — TransitionForward" },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:url", content: "/share/$token" },
    ],
    links: [{ rel: "canonical", href: "/share/$token" }],
  }),
  component: SharedReportPage,
});

function SharedReportPage() {
  const { token } = Route.useParams();
  const resolve = useServerFn(resolveShareToken);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "missing" }
    | { kind: "ok"; audience: "family" | "educator"; report: PathwayReport }
  >({ kind: "loading" });

  useEffect(() => {
    resolve({ data: { token } })
      .then((r) => {
        if (r.ok) setState({ kind: "ok", audience: r.audience, report: r.report });
        else setState({ kind: "missing" });
      })
      .catch(() => setState({ kind: "missing" }));
  }, [resolve, token]);

  if (state.kind === "loading") {
    return (
      <SiteShell>
        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <p className="text-sm text-muted-foreground">Opening the shared report…</p>
        </section>
      </SiteShell>
    );
  }

  if (state.kind === "missing") {
    return (
      <SiteShell>
        <section className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Link unavailable
          </p>
          <h1 className="mt-2 font-display text-3xl">This Share Link Is No Longer Active.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The owner may have revoked access or the link expired. Reach out to whoever shared it
            with you for a fresh link.
          </p>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="report-shell">
        <ReportChapterPager />
        <ReportView
          name="this student"
          report={state.report}
          initialAudience={state.audience}
        />
      </div>
    </SiteShell>
  );
}
