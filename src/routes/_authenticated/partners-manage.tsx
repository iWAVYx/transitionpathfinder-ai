import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, Plus, Loader2, Trash2, Send, Archive, Building2 } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPartnerWorkspace,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  type PartnerWorkspace,
} from "@/lib/partner-workspace.functions";

export const Route = createFileRoute("/_authenticated/partners-manage")({
  head: () => ({ meta: [{ title: "Partner Workspace — TransitionForward" }] }),
  component: () => (<RoleGuard path="/partners-manage"><PartnerManagePage /></RoleGuard>),
});

const TYPES = ["program", "internship", "mentorship", "scholarship", "service", "event"];

function PartnerManagePage() {
  const fetchWs = useServerFn(getPartnerWorkspace);
  const createOp = useServerFn(createOpportunity);
  const updateOp = useServerFn(updateOpportunity);
  const deleteOp = useServerFn(deleteOpportunity);

  const [ws, setWs] = useState<PartnerWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    opportunity_type: "program",
    location: "",
    age_range: "",
    eligibility: "",
    application_url: "",
    contact_email: "",
  });

  async function reload(next?: string) {
    setLoading(true);
    try {
      const w = await fetchWs({ data: { org_id: next } });
      setWs(w);
      setOrgId(w.selected_org_id ?? undefined);
    } catch {
      setWs(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (!orgId) return;
    if (form.title.trim().length < 2) {
      toast.error("Title is required");
      return;
    }
    try {
      await createOp({ data: { organization_id: orgId, ...form } });
      toast.success("Opportunity created");
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        opportunity_type: "program",
        location: "",
        age_range: "",
        eligibility: "",
        application_url: "",
        contact_email: "",
      });
      reload(orgId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create");
    }
  }

  async function setStatus(id: string, status: "draft" | "submitted" | "approved" | "archived") {
    try {
      await updateOp({ data: { id, status } });
      toast.success(`Marked ${status}`);
      reload(orgId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this opportunity?")) return;
    try {
      await deleteOp({ data: { id } });
      toast.success("Deleted");
      reload(orgId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  if (loading && !ws) {
    return (
      <SiteShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </SiteShell>
    );
  }

  if (!ws?.is_partner) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Partner Workspace" }]} />
          <div className="mt-6 rounded-2xl border border-border/60 bg-card p-8 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
            <h1 className="mt-3 font-display text-2xl font-medium">Partner workspace</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You're not currently a member of a partner organization. Reach out to the
              TransitionForward team to get your organization onboarded.
            </p>
            <Button asChild className="mt-5">
              <Link to="/partners">Learn about partnerships</Link>
            </Button>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Partner Workspace" }]} />

        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Partner / Agency
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Your opportunities
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Publish programs, internships, and services to families and students.
            </p>
          </div>
          <div className="flex gap-2">
            {ws.orgs.length > 1 && (
              <Select value={orgId} onValueChange={(v) => reload(v)}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Organization" />
                </SelectTrigger>
                <SelectContent>
                  {ws.orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      <span className="inline-flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" /> {o.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => setShowForm((s) => !s)}>
              <Plus className="mr-1 h-4 w-4" /> New opportunity
            </Button>
          </div>
        </header>

        {showForm && (
          <section className="mt-6 rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="font-display text-lg font-medium">New opportunity</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Summer internship in healthcare"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Select
                  value={form.opportunity_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, opportunity_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Location</label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Hartford, CT"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Age range</label>
                <Input
                  value={form.age_range}
                  onChange={(e) => setForm((f) => ({ ...f, age_range: e.target.value }))}
                  placeholder="16–22"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Application URL</label>
                <Input
                  value={form.application_url}
                  onChange={(e) => setForm((f) => ({ ...f, application_url: e.target.value }))}
                  placeholder="https://"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Eligibility</label>
                <Input
                  value={form.eligibility}
                  onChange={(e) => setForm((f) => ({ ...f, eligibility: e.target.value }))}
                  placeholder="Open to students with IEPs ages 16+"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What students will do, learn, and gain."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Contact email</label>
                <Input
                  value={form.contact_email}
                  onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                  placeholder="programs@example.org"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Save as draft</Button>
            </div>
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-border/60 bg-card">
          <ul className="divide-y divide-border/40">
            {ws.opportunities.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                No opportunities yet. Click "New opportunity" to publish your first one.
              </li>
            ) : (
              ws.opportunities.map((o) => (
                <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          o.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : o.status === "submitted"
                              ? "bg-amber-100 text-amber-700"
                              : o.status === "archived"
                                ? "bg-muted text-muted-foreground"
                                : "bg-muted text-foreground/70"
                        }`}
                      >
                        {o.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{o.opportunity_type}</span>
                    </div>
                    <p className="mt-1 font-medium">{o.title}</p>
                    {o.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {o.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[o.location, o.age_range].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {o.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(o.id, "submitted")}>
                        <Send className="mr-1 h-3.5 w-3.5" /> Submit
                      </Button>
                    )}
                    {o.status !== "archived" && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(o.id, "archived")}>
                        <Archive className="mr-1 h-3.5 w-3.5" /> Archive
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(o.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </SiteShell>
  );
}
