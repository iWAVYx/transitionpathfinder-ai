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
  GraduationCap,
  ShieldCheck,

  XCircle,
  Activity,
  ShieldAlert,
  CreditCard,
} from "lucide-react";
import { BillingPanel } from "@/components/admin/BillingPanel";
import { CoveragePanel } from "@/components/admin/CoveragePanel";
import { GovernancePanel } from "@/components/admin/GovernancePanel";

import { LicensePanel } from "@/components/admin/LicensePanel";



import { HealthTab } from "@/components/admin/health/HealthTab";
import { ModerationTab } from "@/components/admin/moderation/ModerationTab";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  listLicenseAccessCodeOptions,
  mintOrgAccessCode,
  revokeOrgAccessCode,
  listOrgInvitations,
  bulkCreateOrgInvitations,
  revokeOrgInvitation,
  listOrgMembers,
  listLicenseRequests,
  updateLicenseRequest,
  type AdminOrg,
  type AccessCodeAdminOption,
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
  { value: "counselor", label: "Counselor" },
  { value: "school_admin", label: "School Admin" },
  { value: "district_admin", label: "District Admin" },
  { value: "parent", label: "Parent / Guardian" },
  { value: "student", label: "Student" },
  { value: "partner", label: "Partner" },
] as const;

const ACCESS_CODE_ROLES = ROLE_OPTIONS.filter(
  (role) => role.value !== "partner",
);

function licenseTypeForRole(
  role: string,
): AccessCodeAdminOption["license_type"] | null {
  if (role === "student" || role === "parent") return "pathway";
  if (["educator", "case_manager", "counselor"].includes(role)) return "staff";
  if (role === "school_admin" || role === "district_admin") return "admin";
  return null;
}

function accessCodeRolesForTarget(targetType: string | undefined) {
  return ACCESS_CODE_ROLES.filter((role) => {
    if (role.value === "district_admin") return targetType === "district";
    if (role.value === "school_admin") return targetType === "school";
    return targetType === "school" || targetType === "district";
  });
}

function roleDisplayName(role: string): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ??
    role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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
                  <TabsTrigger value="licenses">
                    <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Licenses
                  </TabsTrigger>
                  <TabsTrigger value="billing">
                    <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Billing
                  </TabsTrigger>
                  <TabsTrigger value="coverage">
                    <GraduationCap className="mr-1.5 h-3.5 w-3.5" /> Coverage
                  </TabsTrigger>
                  <TabsTrigger value="governance">
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Governance
                  </TabsTrigger>




                  {isPlatformAdmin && (
                    <TabsTrigger value="requests">
                      <Inbox className="mr-1.5 h-3.5 w-3.5" /> License Requests
                    </TabsTrigger>
                  )}
                  {isPlatformAdmin && (
                    <TabsTrigger value="health">
                      <Activity className="mr-1.5 h-3.5 w-3.5" /> Health
                    </TabsTrigger>
                  )}
                  {isPlatformAdmin && (
                    <TabsTrigger value="moderation">
                      <ShieldAlert className="mr-1.5 h-3.5 w-3.5" /> Moderation
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="codes">
                  <AccessCodesPanel org={selectedOrg} />
                </TabsContent>
                <TabsContent value="invites">
                  <InvitationsPanel org={selectedOrg} />
                </TabsContent>
                <TabsContent value="members">
                  <MembersPanel orgId={selectedOrg.id} />
                </TabsContent>
                <TabsContent value="licenses">
                  <LicensePanel
                    orgId={selectedOrg.id}
                    orgType={selectedOrg.type}
                  />
                </TabsContent>
                <TabsContent value="billing">
                  <BillingPanel
                    orgId={selectedOrg.id}
                    orgType={selectedOrg.type}
                  />
                </TabsContent>
                <TabsContent value="coverage">
                  <CoveragePanel orgId={selectedOrg.id} />
                </TabsContent>
                <TabsContent value="governance">

                  <GovernancePanel orgId={selectedOrg.id} />
                </TabsContent>





                {isPlatformAdmin && (
                  <TabsContent value="requests">
                    <LicenseRequestsPanel />
                  </TabsContent>
                )}
                {isPlatformAdmin && (
                  <TabsContent value="health">
                    <HealthTab />
                  </TabsContent>
                )}
                {isPlatformAdmin && (
                  <TabsContent value="moderation">
                    <ModerationTab />
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

function AccessCodesPanel({ org }: { org: AdminOrg }) {
  const list = useServerFn(listOrgAccessCodes);
  const listOptions = useServerFn(listLicenseAccessCodeOptions);
  const mint = useServerFn(mintOrgAccessCode);
  const revoke = useServerFn(revokeOrgAccessCode);

  const [codes, setCodes] = useState<OrgAccessCodeRow[] | null>(null);
  const [options, setOptions] = useState<AccessCodeAdminOption[] | null>(null);
  const [targetOrgId, setTargetOrgId] = useState(org.id);
  const [role, setRole] = useState("educator");
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState("1");
  const [singleUse, setSingleUse] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [pendingIssue, setPendingIssue] = useState<{
    targetOrgId: string;
    targetName: string;
    role: string;
    label: string;
    capacity: number;
    singleUse: boolean;
    expiresInDays: number;
  } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<OrgAccessCodeRow | null>(null);
  const [freshCode, setFreshCode] = useState<{ id: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(() => {
    setCodes(null);
    setOptions(null);
    Promise.all([
      list({ data: { org_id: org.id } }),
      listOptions({ data: { org_id: org.id } }),
    ])
      .then(([codeResult, optionResult]) => {
        setCodes(codeResult.codes);
        setOptions(optionResult.options);
      })
      .catch(() => {
        setCodes([]);
        setOptions([]);
      });
  }, [list, listOptions, org.id]);
  useEffect(reload, [reload]);

  const targets = useMemo(() => {
    const seen = new Set<string>();
    return (options ?? []).filter((option) => {
      if (seen.has(option.target_organization_id)) return false;
      seen.add(option.target_organization_id);
      return true;
    });
  }, [options]);

  useEffect(() => {
    if (targets.length === 0) return;
    if (!targets.some((target) => target.target_organization_id === targetOrgId)) {
      setTargetOrgId(targets[0].target_organization_id);
    }
  }, [targetOrgId, targets]);

  const selectedTarget = targets.find(
    (target) => target.target_organization_id === targetOrgId,
  );
  const availableRoles = useMemo(
    () => accessCodeRolesForTarget(selectedTarget?.target_organization_type),
    [selectedTarget?.target_organization_type],
  );

  useEffect(() => {
    if (availableRoles.length === 0) return;
    if (!availableRoles.some((option) => option.value === role)) {
      setRole(availableRoles[0].value);
    }
  }, [availableRoles, role]);

  const licenseType = licenseTypeForRole(role);
  const isAdminCodeRole = role === "school_admin" || role === "district_admin";

  useEffect(() => {
    if (!isAdminCodeRole) return;
    setSingleUse(true);
    setCapacity("1");
    setExpiresInDays("7");
  }, [isAdminCodeRole]);

  const capacityRow = options?.find(
    (option) =>
      option.target_organization_id === targetOrgId &&
      option.license_type === licenseType,
  );
  const requestedSeats = singleUse || isAdminCodeRole ? 1 : Number(capacity);
  const expiryDays = Number(expiresInDays);
  const expiryLimit = isAdminCodeRole ? 7 : 365;
  const expiryIsValid =
    Number.isInteger(expiryDays) && expiryDays >= 1 && expiryDays <= expiryLimit;
  const capacityIsValid =
    Number.isInteger(requestedSeats) &&
    requestedSeats >= 1 &&
    requestedSeats <= (capacityRow?.available ?? 0) &&
    expiryIsValid;

  async function onMint(e: React.FormEvent) {
    e.preventDefault();
    if (!capacityIsValid || !targetOrgId || !label.trim()) {
      toast.error("Choose an active license group with enough available seats.");
      return;
    }
    setPendingIssue({
      targetOrgId,
      targetName: selectedTarget?.target_organization_name ?? org.name,
      role,
      label: label.trim(),
      capacity: requestedSeats,
      singleUse: singleUse || isAdminCodeRole,
      expiresInDays: expiryDays,
    });
    setConfirmCreateOpen(true);
  }

  async function confirmMint() {
    const issue = pendingIssue;
    if (!issue) return;
    setConfirmCreateOpen(false);
    setBusy(true);
    try {
      const r = await mint({
        data: {
          org_id: org.id,
          target_organization_id: issue.targetOrgId,
          role: issue.role as "educator",
          label: issue.label,
          capacity: issue.capacity,
          single_use: issue.singleUse,
          expires_in_days: issue.expiresInDays,
        },
      });
      setFreshCode({ id: r.row.id, code: r.code });
      setLabel("");
      toast.success(
        `${issue.capacity} seat${issue.capacity === 1 ? "" : "s"} reserved. Copy the code now; it will not be shown again.`,
      );
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mint code.");
    } finally {
      setBusy(false);
      setPendingIssue(null);
    }
  }

  async function confirmRevoke() {
    const target = revokeTarget;
    if (!target) return;
    setRevokeBusy(true);
    try {
      const result = await revoke({
        data: {
          id: target.id,
          reason: `License activation code "${target.label ?? "Legacy Code"}" revoked through seat management`,
        },
      });
      toast.success(
        `License code revoked. ${result.released_seats} unclaimed seat${result.released_seats === 1 ? "" : "s"} returned.`,
      );
      setRevokeTarget(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Revoke failed.");
    } finally {
      setRevokeBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          License Activation Codes
        </h2>
        {codes === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : codes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8">
            No license codes yet. Create one to reserve seats for account activation.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Label</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Organization</th>
                  <th className="px-3 py-2">Seats</th>
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
                      <td className="px-3 py-2 font-medium">
                        {c.label ?? "Legacy Code"}
                      </td>
                      <td className="px-3 py-2">{roleDisplayName(c.role)}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {c.target_organization_name ?? org.name}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {c.uses}
                        {c.capacity != null ? ` / ${c.capacity}` : ""}
                        {c.capacity != null && !c.revoked_at
                          ? ` · ${Math.max(c.capacity - c.uses, 0)} unclaimed`
                          : ""}
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
                            onClick={() => setRevokeTarget(c)}
                            aria-label={`Revoke ${c.label ?? "license code"}`}
                            title="Revoke License Code"
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

      <form onSubmit={onMint} className="h-fit rounded-lg border bg-muted/20 p-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create License Code
        </h2>
        {options === null ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading Capacity…
          </div>
        ) : targets.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            License activation codes require an active school or district license pool.
          </p>
        ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="ac-label" className="text-xs">Code Label</Label>
            <Input
              id="ac-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Fall Student Cohort"
              maxLength={100}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ac-target" className="text-xs">Account Organization</Label>
            <Select value={targetOrgId} onValueChange={setTargetOrgId}>
              <SelectTrigger id="ac-target" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {targets.map((target) => (
                  <SelectItem
                    key={target.target_organization_id}
                    value={target.target_organization_id}
                  >
                    {target.target_organization_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ac-role" className="text-xs">Account Type</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="ac-role" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ac-cap" className="text-xs">Seats To Reserve</Label>
            <Input
              id="ac-cap"
              type="number"
              min="1"
              max={Math.max(capacityRow?.available ?? 1, 1)}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              disabled={singleUse || isAdminCodeRole}
              className="mt-1"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {capacityRow
                ? `${capacityRow.available} ${capacityRow.license_type} seat${capacityRow.available === 1 ? "" : "s"} available of ${capacityRow.purchased}.`
                : "No matching license capacity is available."}
            </p>
          </div>
          <div>
            <Label htmlFor="ac-exp" className="text-xs">Expires in (days)</Label>
            <Input
              id="ac-exp"
              type="number"
              min="1"
              max={expiryLimit}
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
              disabled={isAdminCodeRole}
            />
            {isAdminCodeRole ? "Required: One Administrator Only" : "One Person Only"}
          </label>
          <Button
            type="submit"
            disabled={busy || !capacityIsValid || !label.trim()}
            className="w-full"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create And Reserve"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Creating the code immediately reserves these seats. The code appears
            once; TransitionForward stores only its secure hash.
            {isAdminCodeRole &&
              " Administrator codes are always single-use and expire within seven days."}
          </p>
        </div>
        )}
      </form>

      <AlertDialog open={confirmCreateOpen} onOpenChange={setConfirmCreateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Seat Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Review the access and capacity impact before creating this license code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingIssue && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 border-y py-4 text-sm">
              <dt className="text-muted-foreground">Label</dt>
              <dd className="text-right font-medium">{pendingIssue.label}</dd>
              <dt className="text-muted-foreground">Organization</dt>
              <dd className="text-right font-medium">{pendingIssue.targetName}</dd>
              <dt className="text-muted-foreground">Account Type</dt>
              <dd className="text-right font-medium">{roleDisplayName(pendingIssue.role)}</dd>
              <dt className="text-muted-foreground">Seats Reserved Now</dt>
              <dd className="text-right font-medium">{pendingIssue.capacity}</dd>
              <dt className="text-muted-foreground">Expires In</dt>
              <dd className="text-right font-medium">{pendingIssue.expiresInDays} days</dd>
            </dl>
          )}
          <p className="text-sm text-muted-foreground">
            This immediately removes the selected seats from available capacity.
            {pendingIssue?.role === "school_admin" ||
            pendingIssue?.role === "district_admin"
              ? " The code grants administrative access to one person."
              : " The seats return automatically if the code expires unused."}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMint} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reserve And Create Code"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !revokeBusy) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke License Code?</AlertDialogTitle>
            <AlertDialogDescription>
              This code will stop working immediately. Review who is affected before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {revokeTarget && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 border-y py-4 text-sm">
              <dt className="text-muted-foreground">Code</dt>
              <dd className="text-right font-medium">{revokeTarget.label ?? "Legacy Code"}</dd>
              <dt className="text-muted-foreground">Activated Accounts</dt>
              <dd className="text-right font-medium">{revokeTarget.uses}</dd>
              <dt className="text-muted-foreground">Seats Returned</dt>
              <dd className="text-right font-medium">
                {revokeTarget.capacity == null
                  ? "Any unclaimed seats"
                  : Math.max(revokeTarget.capacity - revokeTarget.uses, 0)}
              </dd>
            </dl>
          )}
          <p className="text-sm text-muted-foreground">
            Accounts that already activated it will keep their current access. Only
            unclaimed reserved seats return to the license pool. This cannot be undone;
            a new code must be created later if needed.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeBusy}>Keep Code Active</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevoke}
              disabled={revokeBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke Code"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
