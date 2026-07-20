import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  KeyRound,
  Mail,
  Users,
  Inbox,
  Loader2,
  Copy,
  Check,
  Trash2,
  Plus,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";
import {
  listAdminOrgs,
  listOrgAccessCodes,
  mintOrgAccessCode,
  revokeOrgAccessCode,
  listOrgInvitations,
  bulkCreateOrgInvitations,
  revokeOrgInvitation,
  listOrgMembers,
  listLicenseRequests,
  updateLicenseRequest,
  type AdminOrg,
  type OrgAccessCodeRow,
  type OrgInvitationRow,
  type OrgMemberRow,
  type LicenseRequestRow,
} from "@/lib/operator-console.functions";

export const Route = createFileRoute("/_authenticated/admin/orgs")({
  head: () => ({
    meta: [{ title: "Operator Console — TransitionForward" }],
  }),
  errorComponent: dashboardErrorComponent("owner"),
  component: OperatorConsolePage,
});

const ROLE_OPTIONS = [
  { value: "educator", label: "Educator" },
  { value: "case_manager", label: "Case Manager" },
  { value: "school_admin", label: "School Admin" },
  { value: "district_admin", label: "District Admin" },
  { value: "parent", label: "Parent / Guardian" },
  { value: "student", label: "Student" },
  { value: "partner", label: "Partner" },
] as const;

function invitationTypeForOrg(orgType: string): "join_school" | "join_district" | "join_partner_org" {
  if (orgType === "district") return "join_district";
  if (orgType === "partner" || orgType === "partner_organization") return "join_partner_org";
  return "join_school";
}

function statusPill(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-900",
    accepted: "bg-emerald-100 text-emerald-900",
    active: "bg-emerald-100 text-emerald-900",
    revoked: "bg-rose-100 text-rose-900",
    expired: "bg-slate-200 text-slate-700",
    approved: "bg-emerald-100 text-emerald-900",
    denied: "bg-rose-100 text-rose-900",
    in_review: "bg-sky-100 text-sky-900",
    withdrawn: "bg-slate-200 text-slate-700",
    removed: "bg-slate-200 text-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        map[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function OperatorConsolePage() {
  const fetchOrgs = useServerFn(listAdminOrgs);
  const [orgs, setOrgs] = useState<AdminOrg[] | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    fetchOrgs()
      .then((r) => {
        setOrgs(r.orgs);
        setIsPlatformAdmin(r.is_platform_admin);
        setOrgId(r.orgs[0]?.id ?? null);
      })
      .catch((e) => setLoadErr(e instanceof Error ? e.message : "Failed to load orgs"));
  }, [fetchOrgs]);

  const selectedOrg = useMemo(
    () => orgs?.find((o) => o.id === orgId) ?? null,
    [orgs, orgId],
  );

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Breadcrumbs
          trail={[
            { label: "Home", to: "/" },
            { label: "Operator Console" },
          ]}
        />
        <header className="mt-4 mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Operator Console
          </p>
          <h1 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">
            Manage Your Organization
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Mint access codes, invite staff and families, review seat usage, and
            {isPlatformAdmin ? " triage inbound license requests." : " track membership."}
          </p>
        </header>

        {orgs === null && !loadErr && (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your organizations…
          </div>
        )}
        {loadErr && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {loadErr}
          </div>
        )}
        {orgs !== null && orgs.length === 0 && !isPlatformAdmin && (
          <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
            You aren't an admin of any organization yet. Once your school or
            district approves you as an admin, this console will unlock.
          </div>
        )}

        {orgs !== null && orgs.length > 0 && (
          <>
            <div className="mb-6 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[240px]">
                <Label htmlFor="org-picker" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Organization
                </Label>
                <Select value={orgId ?? undefined} onValueChange={setOrgId}>
                  <SelectTrigger id="org-picker" className="mt-1">
                    <SelectValue placeholder="Choose an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {o.name}
                          <span className="text-xs text-muted-foreground">
                            · {o.type}
                            {o.city ? ` · ${o.city}` : ""}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedOrg && (
                <div className="text-xs text-muted-foreground">
                  Role: <span className="font-medium">{selectedOrg.role_within_org}</span>
                </div>
              )}
            </div>

            {selectedOrg && (
              <Tabs defaultValue="codes" className="w-full">
                <TabsList className="mb-4 flex flex-wrap">
                  <TabsTrigger value="codes">
                    <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Access Codes
                  </TabsTrigger>
                  <TabsTrigger value="invites">
                    <Mail className="mr-1.5 h-3.5 w-3.5" /> Invitations
                  </TabsTrigger>
                  <TabsTrigger value="members">
                    <Users className="mr-1.5 h-3.5 w-3.5" /> Members & Seats
                  </TabsTrigger>
                  {isPlatformAdmin && (
                    <TabsTrigger value="requests">
                      <Inbox className="mr-1.5 h-3.5 w-3.5" /> License Requests
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="codes">
                  <AccessCodesPanel orgId={selectedOrg.id} />
                </TabsContent>
                <TabsContent value="invites">
                  <InvitationsPanel org={selectedOrg} />
                </TabsContent>
                <TabsContent value="members">
                  <MembersPanel orgId={selectedOrg.id} />
                </TabsContent>
                {isPlatformAdmin && (
                  <TabsContent value="requests">
                    <LicenseRequestsPanel />
                  </TabsContent>
                )}
              </Tabs>
            )}
          </>
        )}
      </div>
    </SiteShell>
  );
}

// ---------- Access Codes ----------

function AccessCodesPanel({ orgId }: { orgId: string }) {
  const list = useServerFn(listOrgAccessCodes);
  const mint = useServerFn(mintOrgAccessCode);
  const revoke = useServerFn(revokeOrgAccessCode);

  const [codes, setCodes] = useState<OrgAccessCodeRow[] | null>(null);
  const [role, setRole] = useState("educator");
  const [capacity, setCapacity] = useState("");
  const [singleUse, setSingleUse] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [freshCode, setFreshCode] = useState<{ id: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(() => {
    setCodes(null);
    list({ data: { org_id: orgId } })
      .then((r) => setCodes(r.codes))
      .catch(() => setCodes([]));
  }, [list, orgId]);
  useEffect(reload, [reload]);

  async function onMint(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await mint({
        data: {
          org_id: orgId,
          role: role as "educator",
          capacity: capacity ? Number(capacity) : undefined,
          single_use: singleUse,
          expires_in_days: expiresInDays ? Number(expiresInDays) : undefined,
        },
      });
      setFreshCode({ id: r.row.id, code: r.code });
      toast.success("Access code created — copy it now, it won't be shown again.");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mint code.");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(id: string) {
    if (!confirm("Revoke this access code? People who haven't redeemed it yet will be blocked.")) return;
    try {
      await revoke({ data: { id } });
      toast.success("Access code revoked.");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Revoke failed.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Active Codes
        </h2>
        {codes === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : codes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8">No access codes yet — mint one on the right.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Usage</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const status = c.revoked_at
                    ? "revoked"
                    : c.expires_at && new Date(c.expires_at) < new Date()
                    ? "expired"
                    : "active";
                  const showFresh = freshCode?.id === c.id;
                  return (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{c.role}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {c.uses}
                        {c.capacity != null ? ` / ${c.capacity}` : ""}
                        {c.single_use ? " · single-use" : ""}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-3 py-2">{statusPill(status)}</td>
                      <td className="px-3 py-2 text-right">
                        {showFresh && (
                          <button
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            onClick={async () => {
                              await navigator.clipboard.writeText(freshCode.code);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1500);
                            }}
                          >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {freshCode.code}
                          </button>
                        )}
                        {!c.revoked_at && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-7 px-2 text-destructive"
                            onClick={() => onRevoke(c.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form onSubmit={onMint} className="rounded-lg border bg-muted/20 p-4 h-fit">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Mint Access Code
        </h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ac-role" className="text-xs">Role granted</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="ac-role" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ac-cap" className="text-xs">Max redemptions (optional)</Label>
            <Input
              id="ac-cap"
              type="number"
              min="1"
              placeholder="Unlimited"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ac-exp" className="text-xs">Expires in (days)</Label>
            <Input
              id="ac-exp"
              type="number"
              min="1"
              max="365"
              placeholder="Never"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className="mt-1"
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={singleUse}
              onChange={(e) => setSingleUse(e.target.checked)}
            />
            Single-use (one person only)
          </label>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mint Code"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            The plaintext code appears once, next to the new row. We only store its hash.
          </p>
        </div>
      </form>
    </div>
  );
}

// ---------- Invitations ----------

function InvitationsPanel({ org }: { org: AdminOrg }) {
  const list = useServerFn(listOrgInvitations);
  const bulk = useServerFn(bulkCreateOrgInvitations);
  const revoke = useServerFn(revokeOrgInvitation);

  const [invites, setInvites] = useState<OrgInvitationRow[] | null>(null);
  const [role, setRole] = useState("educator");
  const [emailsText, setEmailsText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    setInvites(null);
    list({ data: { org_id: org.id } })
      .then((r) => setInvites(r.invitations))
      .catch(() => setInvites([]));
  }, [list, org.id]);
  useEffect(reload, [reload]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const emails = emailsText
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.includes("@"));
    if (emails.length === 0) {
      toast.error("Add at least one email address.");
      return;
    }
    setBusy(true);
    try {
      const r = await bulk({
        data: {
          org_id: org.id,
          invited_role: role as "educator",
          invitation_type: invitationTypeForOrg(org.type),
          emails,
          message: message || undefined,
          expires_in_days: 14,
        },
      });
      toast.success(
        `Sent ${r.created} invitation${r.created === 1 ? "" : "s"}${
          r.skipped ? ` · skipped ${r.skipped} duplicate${r.skipped === 1 ? "" : "s"}` : ""
        }.`,
      );
      setEmailsText("");
      setMessage("");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invitations.");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(id: string) {
    try {
      await revoke({ data: { id } });
      toast.success("Invitation revoked.");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Revoke failed.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Invitations
        </h2>
        {invites === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : invites.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8">No invitations yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Sent</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="px-3 py-2">{i.email}</td>
                    <td className="px-3 py-2 text-muted-foreground">{i.invited_role}</td>
                    <td className="px-3 py-2">{statusPill(i.status)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(i.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {i.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive"
                          onClick={() => onRevoke(i.id)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form onSubmit={onSend} className="rounded-lg border bg-muted/20 p-4 h-fit">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4" /> Send Invitations
        </h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="inv-role" className="text-xs">Invited role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="inv-role" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="inv-emails" className="text-xs">
              Emails (comma, space, or newline separated)
            </Label>
            <Textarea
              id="inv-emails"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              placeholder="teacher@school.org, aide@school.org"
              rows={4}
              className="mt-1 font-mono text-xs"
            />
          </div>
          <div>
            <Label htmlFor="inv-msg" className="text-xs">Personal note (optional)</Label>
            <Textarea
              id="inv-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invitations"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------- Members / seats ----------

function MembersPanel({ orgId }: { orgId: string }) {
  const list = useServerFn(listOrgMembers);
  const [members, setMembers] = useState<OrgMemberRow[] | null>(null);

  useEffect(() => {
    setMembers(null);
    list({ data: { org_id: orgId } })
      .then((r) => setMembers(r.members))
      .catch(() => setMembers([]));
  }, [list, orgId]);

  const active = (members ?? []).filter((m) => m.membership_status === "active");
  const pending = (members ?? []).filter((m) => m.membership_status === "pending");

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Active seats" value={active.length} />
        <StatCard label="Pending requests" value={pending.length} />
        <StatCard label="Total on roster" value={(members ?? []).length} />
      </div>

      {members === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (members ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground py-8">No members yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{m.full_name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.email ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{m.role_within_org}</Badge>
                  </td>
                  <td className="px-3 py-2">{statusPill(m.membership_status)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

// ---------- License requests ----------

function LicenseRequestsPanel() {
  const list = useServerFn(listLicenseRequests);
  const update = useServerFn(updateLicenseRequest);

  const [requests, setRequests] = useState<LicenseRequestRow[] | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setRequests(null);
    list()
      .then((r) => setRequests(r.requests))
      .catch(() => setRequests([]));
  }, [list]);
  useEffect(reload, [reload]);

  async function decide(id: string, status: "in_review" | "approved" | "denied") {
    setBusyId(id);
    try {
      await update({
        data: { id, status, review_notes: notesById[id] || undefined },
      });
      toast.success(`Request ${status}.`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (requests === null)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  if (requests.length === 0)
    return <p className="text-sm text-muted-foreground py-8">No license requests pending.</p>;

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{r.org_name}</h3>
                <Badge variant="outline">{r.org_type}</Badge>
                {statusPill(r.status)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {r.contact_name ? `${r.contact_name} · ` : ""}
                {r.contact_email}
                {r.contact_phone ? ` · ${r.contact_phone}` : ""}
                {r.seat_count != null ? ` · ${r.seat_count} seats requested` : ""}
              </p>
              {r.notes && <p className="text-sm mt-2 whitespace-pre-wrap">{r.notes}</p>}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleDateString()}
            </div>
          </div>

          {(r.status === "pending" || r.status === "in_review") && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Review notes (optional)"
                rows={2}
                value={notesById[r.id] ?? ""}
                onChange={(e) => setNotesById((s) => ({ ...s, [r.id]: e.target.value }))}
                className="text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => decide(r.id, "in_review")}>
                  Mark in review
                </Button>
                <Button size="sm" disabled={busyId === r.id} onClick={() => decide(r.id, "approved")}>
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Approve
                </Button>
                <Button size="sm" variant="destructive" disabled={busyId === r.id} onClick={() => decide(r.id, "denied")}>
                  <XCircle className="mr-1 h-3.5 w-3.5" /> Deny
                </Button>
              </div>
            </div>
          )}
          {r.review_notes && r.status !== "pending" && (
            <p className="text-xs text-muted-foreground mt-3">Notes: {r.review_notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}
