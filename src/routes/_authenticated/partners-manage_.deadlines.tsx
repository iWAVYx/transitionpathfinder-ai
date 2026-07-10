import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, ExternalLink, Loader2, Mail } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getPartnerWorkspace,
  type PartnerWorkspace,
} from "@/lib/partner-workspace.functions";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/partners-manage_/deadlines")({
  beforeLoad: () => ensureRoleAccess(["partner", "admin"]),
  head: () => ({
    meta: [
      { title: "Application Windows — Partner Workspace" },
      {
        name: "description",
        content:
          "Every currently-published opportunity your organization offers — application links and contact info in one place.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/partners-manage/deadlines">
      <PartnerDeadlinesPage />
    </RoleGuard>
  ),
});

function PartnerDeadlinesPage() {
  const loadWs = useServerFn(getPartnerWorkspace);
  const [ws, setWs] = useState<PartnerWorkspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const w = await loadWs({ data: {} });
        if (alive) setWs(w);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadWs]);

  const active = (ws?.opportunities ?? [])
    .filter((o) => o.status === "approved")
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Breadcrumbs
          trail={[
            { label: "Partner Workspace", to: "/partners-manage" },
            { label: "Application Windows" },
          ]}
        />

        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Partner Workspace
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
            Application Windows
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every opportunity your organization currently has published — students and families
            can apply through these links right now.
          </p>
        </header>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !ws?.is_partner ? (
            <EmptyCard
              title="Set up your partner organization"
              body="Go to your Partner Workspace to create your organization before publishing opportunities."
              ctaTo="/partners-manage"
              ctaLabel="Open Partner Workspace"
            />
          ) : active.length === 0 ? (
            <EmptyCard
              title="No published opportunities yet"
              body="Once an opportunity is approved, it will appear here with the application link families use."
              ctaTo="/partners-manage/opportunities"
              ctaLabel="Manage opportunities"
            />
          ) : (
            <div className="rounded-2xl border bg-card shadow-soft">
              <div className="flex items-center gap-2 border-b px-5 py-4">
                <CalendarClock className="h-4 w-4 text-primary" />
                <h2 className="font-medium">{active.length} active opportunities</h2>
              </div>
              <ul className="divide-y">
                {active.map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{o.title}</span>
                        <Badge variant="secondary">
                          {o.opportunity_type.replaceAll("_", " ")}
                        </Badge>
                        {o.age_range && <Badge variant="outline">Ages {o.age_range}</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[o.location, o.eligibility].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Published {new Date(o.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {o.application_url && (
                        <Button asChild size="sm">
                          <a href={o.application_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" /> Apply link
                          </a>
                        </Button>
                      )}
                      {o.contact_email && (
                        <Button asChild size="sm" variant="outline">
                          <a href={`mailto:${o.contact_email}`}>
                            <Mail className="h-3.5 w-3.5" /> Contact
                          </a>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

function EmptyCard({
  title,
  body,
  ctaTo,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaTo: string;
  ctaLabel: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{body}</p>
      <Button asChild className="mt-4">
        <Link to={ctaTo}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
