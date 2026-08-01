import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertTriangle,
  Loader2,
  Mail,
  RotateCcw,
  Upload,
  UserMinus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  bulkInviteSponsored,
  cancelSponsoredInvitation,
  getLicenseOverview,
  inviteSponsoredMember,
  resendSponsoredInvitation,
  revokeAllocation,
  type CapacityRow,
  type LicenseType,
} from "@/lib/billing/licensing.functions";
import { UTILIZATION_ALERTS } from "@/lib/billing/plans";

const LICENSE_LABEL: Record<LicenseType, string> = {
  pathway: "Student Pathway Licenses",
  staff: "Educator & Counselor Staff Seats",
  admin: "Administrative Seats",
};

const INVITE_ROLES = [
  { value: "student", label: "Student — uses a pathway license" },
  { value: "parent", label: "Parent or guardian — uses a pathway license" },
  { value: "educator", label: "Educator — uses a staff seat" },
  { value: "case_manager", label: "Case manager — uses a staff seat" },
  { value: "school_admin", label: "School administrator — uses an admin seat" },
  {
    value: "district_admin",
    label: "District administrator — uses an admin seat",
  },
];

function utilizationTone(pct: number): string {
  if (pct >= 100) return "text-destructive";
  if (pct >= 90) return "text-amber-600 dark:text-amber-500";
  if (pct >= 80) return "text-muted-foreground";
  return "text-muted-foreground";
}

function CapacityCard({ row }: { row: CapacityRow }) {
  const pct = Math.round(Number(row.utilization) * 100);
  const alert = UTILIZATION_ALERTS.map((t) => t * 100).filter((t) => pct >= t).pop();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{LICENSE_LABEL[row.license_type]}</CardTitle>
        <CardDescription>
          <span className="font-display text-2xl text-foreground">
            {row.available}
          </span>{" "}
          available of {row.purchased}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${LICENSE_LABEL[row.license_type]} utilization`}
        >
          <div
            className={
              pct >= 100
                ? "h-full bg-destructive"
                : pct >= 90
                  ? "h-full bg-amber-500"
                  : "h-full bg-primary"
            }
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <p className={`text-xs ${utilizationTone(pct)}`}>
          {row.active} active · {row.reserved} reserved · {pct}% used
        </p>
        {alert && (
          <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {pct >= 100
              ? "Capacity is full. Purchase an add-on pack to invite more people."
              : `You have used ${alert}% of this capacity.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Sponsored-access management for a school or district administrator:
 * purchased vs. reserved vs. active capacity, invitations, bulk CSV, and
 * revocation. Every capacity change happens inside a database transaction,
 * so two admins inviting simultaneously can never over-allocate.
 */
export function LicensePanel({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getLicenseOverview);
  const invite = useServerFn(inviteSponsoredMember);
  const resend = useServerFn(resendSponsoredInvitation);
  const cancel = useServerFn(cancelSponsoredInvitation);
  const revoke = useServerFn(revokeAllocation);
  const bulk = useServerFn(bulkInviteSponsored);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [csv, setCsv] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const overview = useQuery({
    queryKey: ["licenses", orgId],
    queryFn: () => fetchOverview({ data: { organizationId: orgId } }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["licenses", orgId] });
  };

  const inviteOne = useMutation({
    mutationFn: () =>
      invite({ data: { organizationId: orgId, email: email.trim(), role } }),
    onSuccess: (res) => {
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Invitation sent to ${email.trim()}.`);
      setEmail("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkInvite = useMutation({
    mutationFn: () => bulk({ data: { organizationId: orgId, csv } }),
    onSuccess: (res) => {
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `${res.invited} invited${res.skipped.length ? `, ${res.skipped.length} skipped` : ""}.`,
      );
      if (res.skipped.length) {
        console.warn("Skipped rows:", res.skipped);
      }
      setCsv("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rowAction = useMutation({
    mutationFn: async (args:
      | { kind: "resend"; invitationId: string }
      | { kind: "cancel"; invitationId: string }
      | { kind: "revoke"; allocationId: string; reason: string }) => {
      if (args.kind === "resend") {
        return resend({ data: { invitationId: args.invitationId } });
      }
      if (args.kind === "cancel") {
        return cancel({ data: { invitationId: args.invitationId } });
      }
      return revoke({
        data: { allocationId: args.allocationId, reason: args.reason },
      });
    },
    onSuccess: (res) => {
      if (res && "error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("License updated.");
      setRevokeTarget(null);
      setRevokeReason("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const capacity = overview.data?.capacity ?? [];
  const allocations = overview.data?.allocations ?? [];
  const liveAllocations = useMemo(
    () => allocations.filter((a) => a.state === "reserved" || a.state === "active"),
    [allocations],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {capacity.length === 0 && !overview.isLoading ? (
          <p className="text-sm text-muted-foreground">
            No purchased capacity yet. Start a school or district plan in the
            Billing tab, then invite people here.
          </p>
        ) : (
          capacity.map((row) => <CapacityCard key={row.license_type} row={row} />)
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Invite Someone</CardTitle>
          <CardDescription>
            The license is reserved as soon as you invite, and released
            automatically if the invitation expires.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="license-invite-email">Email</Label>
              <Input
                id="license-invite-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="person@school.org"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="license-invite-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="license-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={!email.trim() || inviteOne.isPending}
              onClick={() => inviteOne.mutate()}
            >
              {inviteOne.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="mr-1.5 h-3.5 w-3.5" />
              )}
              Invite
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="license-bulk-csv">
              Bulk invite (CSV: email, role)
            </Label>
            <Textarea
              id="license-bulk-csv"
              rows={4}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder={"email,role\nstudent@school.org,student\nteacher@school.org,educator"}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={!csv.trim() || bulkInvite.isPending}
                onClick={() => bulkInvite.mutate()}
              >
                {bulkInvite.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                )}
                Upload list
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Allocated Licenses</CardTitle>
          <CardDescription>
            Reserved invitations count against capacity until they are accepted,
            cancelled, or expire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading licenses…</p>
          ) : liveAllocations.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" aria-hidden /> Nobody is using a
              sponsored license yet.
            </p>
          ) : (
            <ul className="divide-y">
              {liveAllocations.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {a.beneficiary_email ?? "Connected account"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {LICENSE_LABEL[a.license_type]}
                      {a.invitation_source === "csv_bulk_invite" && " · bulk invite"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant={a.state === "active" ? "default" : "secondary"}>
                      {a.state === "active" ? "Active" : "Reserved"}
                    </Badge>
                    {a.state === "reserved" && a.invitation_id && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={rowAction.isPending}
                          onClick={() =>
                            rowAction.mutate({
                              kind: "resend",
                              invitationId: a.invitation_id!,
                            })
                          }
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Resend
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={rowAction.isPending}
                          onClick={() =>
                            rowAction.mutate({
                              kind: "cancel",
                              invitationId: a.invitation_id!,
                            })
                          }
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {a.state === "active" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={rowAction.isPending}
                        onClick={() => {
                          setRevokeReason("");
                          setRevokeTarget(a.id);
                        }}
                      >
                        <UserMinus className="mr-1.5 h-3.5 w-3.5" /> Revoke
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke This License</DialogTitle>
            <DialogDescription>
              The seat returns to your pool right away. Manual capacity changes
              are recorded permanently, so a written reason is required.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            placeholder="Why is this license being revoked? (at least 10 characters)"
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRevokeTarget(null)}
              disabled={rowAction.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={rowAction.isPending || revokeReason.trim().length < 10}
              onClick={() =>
                revokeTarget &&
                rowAction.mutate({
                  kind: "revoke",
                  allocationId: revokeTarget,
                  reason: revokeReason.trim(),
                })
              }
            >
              Revoke License
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
