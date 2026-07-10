import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Briefcase,
  Loader2,
  Send,
  Archive,
  Trash2,
  Plus,
  ExternalLink,
} from "lucide-react";
import { z } from "zod";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  getPartnerWorkspace,
  updateOpportunity,
  deleteOpportunity,
  type PartnerWorkspace,
} from "@/lib/partner-workspace.functions";
import { opportunityStatusLabel } from "@/lib/opportunity-status";
import { ensureRoleAccess } from "@/lib/route-role-guard";

type StatusFilter = "all" | "draft" | "pending_review" | "approved" | "inactive";

const statusSearchSchema = z.object({
  status: z
    .enum(["all", "draft", "pending_review", "approved", "inactive"])
    .catch("all"),
});

export const Route = createFileRoute("/_authenticated/partners-manage_/opportunities")({
  beforeLoad: () => ensureRoleAccess(["partner", "admin"]),
  validateSearch: statusSearchSchema,
  head: () => ({
    meta: [
      { title: "My Opportunities — Partner Workspace" },
      {
        name: "description",
        content:
          "Publish, unpublish, and manage every opportunity your organization has created.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/partners-manage/opportunities">
      <PartnerOpportunitiesPage />
    </RoleGuard>
  ),
});

const TAB_LABELS: Record<StatusFilter, string> = {
  all: "All",
  approved: "Active",
  pending_review: "Pending review",
  draft: "Drafts",
  inactive: "Archived",
};
const TAB_ORDER: StatusFilter[] = [
  "all",
  "approved",
  "pending_review",
  "draft",
  "inactive",
];

function PartnerOpportunitiesPage() {
  const { status } = useSearch({ from: Route.id });
  const navigate = Route.useNavigate();

  const loadWs = useServerFn(getPartnerWorkspace);
  const updateOp = useServerFn(updateOpportunity);
  const deleteOp = useServerFn(deleteOpportunity);

  const [ws, setWs] = useState<PartnerWorkspace | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const w = await loadWs({ data: {} });
      setWs(w);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load opportunities.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(
    id: string,
    next: "draft" | "pending_review" | "approved" | "inactive",
  ) {
    try {
      await updateOp({ data: { id, status: next } });
      toast.success(`Marked ${opportunityStatusLabel(next)}`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this opportunity?")) return;
    try {
      await deleteOp({ data: { id } });
      toast.success("Deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const filtered = useMemo(() => {
    const opps = ws?.opportunities ?? [];
    if (status === "all") return opps;
    return opps.filter((o) => o.status === status);
  }, [ws, status]);

  const counts = useMemo(() => {
    const map: Record<StatusFilter, number> = {
      all: ws?.opportunities.length ?? 0,
      approved: 0,
      pending_review: 0,
      draft: 0,
      inactive: 0,
    };
    for (const o of ws?.opportunities ?? []) {
      if (o.status in map) map[o.status as StatusFilter] += 1;
    }
    return map;
  }, [ws]);

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Breadcrumbs
          trail={[
            { label: "Partner Workspace", to: "/partners-manage" },
            { label: "My Opportunities" },
          ]}
        />

        <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Partner Workspace
            </p>
            <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
              My Opportunities
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every opportunity your organization has created — publish, unpublish, or edit.
            </p>
          </div>
          <Button asChild>
            <Link to="/partners-manage">
              <Plus className="h-4 w-4" /> Create opportunity
            </Link>
          </Button>
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !ws?.is_partner ? (
          <div className="mt-8 rounded-2xl border bg-card p-8 text-center shadow-soft">
            <h2 className="font-display text-xl">Set up your partner organization first</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Go to your Partner Workspace to create your organization.
            </p>
            <Button asChild className="mt-4">
              <Link to="/partners-manage">Open Partner Workspace</Link>
            </Button>
          </div>
        ) : (
          <Tabs
            value={status}
            onValueChange={(v) =>
              navigate({ search: { status: v as StatusFilter } })
            }
            className="mt-6"
          >
            <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
              {TAB_ORDER.map((k) => (
                <TabsTrigger key={k} value={k}>
                  {TAB_LABELS[k]}
                  <Badge variant="secondary" className="ml-2">
                    {counts[k]}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={status} className="mt-4">
              {filtered.length === 0 ? (
                <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
                  <Briefcase className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No opportunities in this category.
                  </p>
                </div>
              ) : (
                <ul className="divide-y rounded-2xl border bg-card shadow-soft">
                  {filtered.map((o) => (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{o.title}</span>
                          <Badge variant="secondary">
                            {opportunityStatusLabel(o.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {o.opportunity_type.replaceAll("_", " ")}
                          </span>
                        </div>
                        {o.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {o.description}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[o.location, o.age_range].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {o.application_url && (
                          <Button asChild size="sm" variant="ghost">
                            <a
                              href={o.application_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Application
                            </a>
                          </Button>
                        )}
                        {o.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => setStatus(o.id, "pending_review")}
                          >
                            <Send className="h-3.5 w-3.5" /> Submit for review
                          </Button>
                        )}
                        {o.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus(o.id, "inactive")}
                          >
                            <Archive className="h-3.5 w-3.5" /> Unpublish
                          </Button>
                        )}
                        {o.status === "inactive" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus(o.id, "draft")}
                          >
                            Restore
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(o.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </section>
    </SiteShell>
  );
}
