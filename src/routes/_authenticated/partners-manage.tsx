import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Briefcase,
  Plus,
  Loader2,
  Trash2,
  Send,
  Archive,
  Building2,
  Settings2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getPartnerWorkspace,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  createPartnerOrg,
  updatePartnerOrgProfile,
  type PartnerWorkspace,
  type PartnerOrg,
} from "@/lib/partner-workspace.functions";
import { NextBestAction } from "@/components/dashboard/NextBestAction";
import { JourneyStrip } from "@/components/dashboard/JourneyStrip";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { OpportunityStatusStats } from "@/components/dashboard/OpportunityStatusStats";
import { ROLE_DASHBOARD_TEST_IDS } from "@/lib/dashboard-testids";
import { ensureRoleAccess } from "@/lib/route-role-guard";
import { opportunityStatusLabel } from "@/lib/opportunity-status";
import { PartnerImpactSummaryCard } from "@/components/dashboard/PartnerImpactSummaryCard";

import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";

export const Route = createFileRoute("/_authenticated/partners-manage")({
  head: () => ({ meta: [{ title: "Partner Workspace — TransitionForward" }] }),
  beforeLoad: () => ensureRoleAccess(["partner", "admin"]),
  errorComponent: dashboardErrorComponent("partner"),
  component: () => (
    <RoleGuard path="/partners-manage" fallback={<PartnerDashboardFallback />}>
      <PartnerManagePage />
    </RoleGuard>
  ),
});

const TYPES: { value: string; label: string }[] = [
  { value: "college_program", label: "College program" },
  { value: "technical_school", label: "Technical school" },
  { value: "certificate_program", label: "Certificate program" },
  { value: "employer", label: "Employer" },
  { value: "internship", label: "Internship" },
  { value: "mentorship", label: "Mentorship" },
  { value: "job_shadowing", label: "Job shadowing" },
  { value: "agency_support", label: "Agency support" },
  { value: "community_resource", label: "Community resource" },
];

function PartnerDashboardFallback() {
  return (
    <SiteShell dashboardTestId={ROLE_DASHBOARD_TEST_IDS.partner}>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
          data-dashboard-landmark="partner"
        >
          Partner Workspace — Opportunities
        </p>
        <h1 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">
          Partner Dashboard
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Loading your organization, active opportunities, and applicants —
          this may take a moment on first load.
        </p>
      </div>
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading Partner Workspace…</span>
      </div>
    </SiteShell>
  );
}

function PartnerManagePage() {
  const fetchWs = useServerFn(getPartnerWorkspace);
  const createOp = useServerFn(createOpportunity);
  const updateOp = useServerFn(updateOpportunity);
  const deleteOp = useServerFn(deleteOpportunity);
  const createOrg = useServerFn(createPartnerOrg);

  const [ws, setWs] = useState<PartnerWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    opportunity_type: "internship",
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
      setOrgId(w.selected_org?.id);
    } catch (e) {
      setWs(null);
      toast.error(e instanceof Error ? e.message : "Could not load your partner workspace.");
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
      toast.success("Opportunity created as draft");
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        opportunity_type: "internship",
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

  async function setStatus(
    id: string,
    status: "draft" | "pending_review" | "approved" | "inactive",
  ) {
    try {
      await updateOp({ data: { id, status } });
      toast.success(`Marked ${opportunityStatusLabel(status)}`);
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
      <SiteShell dashboardTestId={ROLE_DASHBOARD_TEST_IDS.partner}>
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">

          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
            data-dashboard-landmark="partner"
          >
            Partner Workspace — Opportunities
          </p>
        </div>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </SiteShell>
    );
  }

  if (!ws?.is_partner) {
    return (
      <SiteShell dashboardTestId={ROLE_DASHBOARD_TEST_IDS.partner}>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">

          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
            data-dashboard-landmark="partner"
          >
            Partner Workspace — Opportunities
          </p>
          <Breadcrumbs trail={[{ label: "Partner Workspace" }]} />
          <FirstRunSetup
            onCreate={async (values) => {
              try {
                const { id } = await createOrg({ data: values });
                toast.success("Organization created");
                await reload(id);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not create");
              }
            }}
          />
        </div>
      </SiteShell>
    );
  }

  const org = ws.selected_org!;

  return (
    <SiteShell dashboardTestId={ROLE_DASHBOARD_TEST_IDS.partner}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
          data-dashboard-landmark="partner"
        >
          Partner Workspace — Opportunities
        </p>
        <Breadcrumbs trail={[{ label: "Partner Workspace" }]} />

        <div className="mt-6">
          <NextBestAction surface="partner" /><div className="mt-4"><JourneyStrip surface="partner" /></div>
          <OnboardingChecklist surface="partner" className="mt-4" />
        </div>

        <header className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:justify-between">
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Partner / Agency
            </p>
            <h1 className="mt-1.5 truncate font-display text-2xl font-medium tracking-tight sm:text-3xl lg:text-4xl">
              {org.name}
            </h1>
            <p className="mt-1 inline-flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <VerifiedPill status={org.verified_status} />
              <span className="truncate">{[org.city, org.state].filter(Boolean).join(", ") || "Location not set"}</span>
            </p>
          </div>
          <div className="col-span-2 flex gap-2 sm:col-span-1 sm:justify-end">
            {ws.orgs.length > 1 && (
              <Select value={orgId} onValueChange={(v) => reload(v)}>
                <SelectTrigger className="w-full sm:w-64">
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
          </div>
        </header>

        {/* PartnerForward — Incentives & Support layer (not a duplicate dashboard) */}
        <Link
          to="/partnerforward/incentives"
          className="mt-6 flex items-center justify-between gap-4 border-y border-primary/30 bg-primary/5 py-4 transition hover:bg-primary/10 sm:px-3"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              PartnerForward
            </p>
            <p className="mt-1 font-display text-base font-medium tracking-tight">
              Incentives & Support
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tax credits, grants, sponsorships, inclusive-hiring resources,
              and accessibility supports — plain language, with links to
              authoritative sources.
            </p>
          </div>
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        </Link>


        <Tabs defaultValue="opportunities" className="mt-6">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="opportunities">
              <Briefcase className="mr-1.5 h-3.5 w-3.5" /> Opportunities
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities" className="mt-4 space-y-6">
            <OpportunityStatusStats opps={ws.opportunities} />
            <PartnerImpactSummaryCard orgId={org.id} />


            <div className="flex justify-end">
              <Button onClick={() => setShowForm((s) => !s)}>
                <Plus className="mr-1 h-4 w-4" /> Create Opportunity
              </Button>
            </div>

            {showForm && (
              <section className="border-y border-border/70 py-5">
                <h2 className="font-display text-lg font-medium">Create Opportunity</h2>
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
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, opportunity_type: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
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
                    <label className="text-xs font-medium text-muted-foreground">
                      Application URL
                    </label>
                    <Input
                      value={form.application_url}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, application_url: e.target.value }))
                      }
                      placeholder="https://"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Eligibility
                    </label>
                    <Input
                      value={form.eligibility}
                      onChange={(e) => setForm((f) => ({ ...f, eligibility: e.target.value }))}
                      placeholder="Open to students with IEPs ages 16+"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Description
                    </label>
                    <Textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="What students will do, learn, and gain."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Contact email
                    </label>
                    <Input
                      value={form.contact_email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, contact_email: e.target.value }))
                      }
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

            <section className="border-y border-border/70">
              <ul className="divide-y divide-border/40">
                {ws.opportunities.length === 0 ? (
                  <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No opportunities yet. Click "Create Opportunity" to publish your first one.
                  </li>
                ) : (
                  ws.opportunities.map((o) => (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <StatusPill status={o.status} />
                          <span className="text-xs text-muted-foreground">
                            {TYPES.find((t) => t.value === o.opportunity_type)?.label ??
                              o.opportunity_type}
                          </span>
                        </div>
                        <p className="mt-1 font-medium">{o.title}</p>
                        {o.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {o.description}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[o.location, o.age_range].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {o.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus(o.id, "pending_review")}
                          >
                            <Send className="mr-1 h-3.5 w-3.5" /> Submit for review
                          </Button>
                        )}
                        {o.status !== "inactive" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setStatus(o.id, "inactive")}
                          >
                            <Archive className="mr-1 h-3.5 w-3.5" /> Archive
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(o.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <p className="text-xs text-muted-foreground">
              Drafts are private. Submit for review when ready — the TransitionForward team
              approves listings before they appear in family- and student-facing search.{" "}
              <Link to="/help" className="underline">
                Questions?
              </Link>
            </p>
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <ProfileEditor
              org={org}
              onSaved={() => reload(org.id)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </SiteShell>
  );
}

function VerifiedPill({ status }: { status: string }) {
  const styles =
    status === "verified"
      ? "bg-emerald-100 text-emerald-700"
      : status === "rejected"
        ? "bg-rose-100 text-rose-700"
        : "bg-amber-100 text-amber-700";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles}`}
    >
      {status === "verified" && <CheckCircle2 className="h-3 w-3" />}
      {status}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles =
    status === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : status === "pending_review"
        ? "bg-amber-100 text-amber-700"
        : status === "inactive"
          ? "bg-muted text-muted-foreground"
          : "bg-muted text-foreground/70";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles}`}
    >
      {opportunityStatusLabel(status)}
    </span>
  );
}

function FirstRunSetup({
  onCreate,
}: {
  onCreate: (v: {
    name: string;
    type: "partner" | "agency";
    website?: string;
    contact_email?: string;
    city?: string;
    state?: string;
  }) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [v, setV] = useState({
    name: "",
    type: "partner" as "partner" | "agency",
    website: "",
    contact_email: "",
    city: "",
    state: "CT",
  });
  return (
    <div className="mt-6 border-y border-border/70 py-6">
      <Briefcase className="h-7 w-7 text-primary" />
      <h1 className="mt-3 font-display text-2xl font-medium">Set up your partner workspace</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us about your organization. We'll create your workspace and you can start
        drafting opportunities right away. A real person reviews each listing before it's
        published publicly.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Organization name</label>
          <Input
            value={v.name}
            onChange={(e) => setV((s) => ({ ...s, name: e.target.value }))}
            placeholder="e.g. Capital Community College"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <Select
            value={v.type}
            onValueChange={(val) => setV((s) => ({ ...s, type: val as "partner" | "agency" }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="partner">Partner organization</SelectItem>
              <SelectItem value="agency">State agency</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Website</label>
          <Input
            value={v.website}
            onChange={(e) => setV((s) => ({ ...s, website: e.target.value }))}
            placeholder="https://"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Contact email</label>
          <Input
            value={v.contact_email}
            onChange={(e) => setV((s) => ({ ...s, contact_email: e.target.value }))}
            placeholder="hello@org.org"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">City</label>
          <Input
            value={v.city}
            onChange={(e) => setV((s) => ({ ...s, city: e.target.value }))}
            placeholder="Hartford"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">State</label>
          <Input
            value={v.state}
            onChange={(e) => setV((s) => ({ ...s, state: e.target.value }))}
            placeholder="CT"
          />
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Button
          disabled={submitting || v.name.trim().length < 2}
          onClick={async () => {
            setSubmitting(true);
            try {
              await onCreate({
                name: v.name.trim(),
                type: v.type,
                website: v.website || undefined,
                contact_email: v.contact_email || undefined,
                city: v.city || undefined,
                state: v.state || undefined,
              });
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? "Creating…" : "Create workspace"}
        </Button>
      </div>
    </div>
  );
}

function ProfileEditor({ org, onSaved }: { org: PartnerOrg; onSaved: () => void }) {
  const updateProfile = useServerFn(updatePartnerOrgProfile);
  const [v, setV] = useState({
    name: org.name,
    website: org.website ?? "",
    contact_email: org.contact_email ?? "",
    city: org.city ?? "",
    state: org.state ?? "",
    address: org.address ?? "",
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="border-y border-border/70 py-5">
      <h2 className="font-display text-lg font-medium">Organization profile</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Families and educators see this information when browsing your opportunities.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <Input
            value={v.name}
            onChange={(e) => setV((s) => ({ ...s, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Website</label>
          <Input
            value={v.website}
            onChange={(e) => setV((s) => ({ ...s, website: e.target.value }))}
            placeholder="https://"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Contact email</label>
          <Input
            value={v.contact_email}
            onChange={(e) => setV((s) => ({ ...s, contact_email: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">City</label>
          <Input
            value={v.city}
            onChange={(e) => setV((s) => ({ ...s, city: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">State</label>
          <Input
            value={v.state}
            onChange={(e) => setV((s) => ({ ...s, state: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Address</label>
          <Input
            value={v.address}
            onChange={(e) => setV((s) => ({ ...s, address: e.target.value }))}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          disabled={saving || v.name.trim().length < 2}
          onClick={async () => {
            setSaving(true);
            try {
              await updateProfile({
                data: {
                  id: org.id,
                  name: v.name.trim(),
                  website: v.website || undefined,
                  contact_email: v.contact_email || undefined,
                  city: v.city || undefined,
                  state: v.state || undefined,
                  address: v.address || undefined,
                },
              });
              toast.success("Profile updated");
              onSaved();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to save");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
