import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shield, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  getRightsStatus,
  setRightsStatus,
  RIGHTS_STATUS_VALUES,
  RIGHTS_STATUS_LABELS,
  type RightsStatus,
  type RightsTransferRow,
} from "@/lib/rights.functions";

type Props = { studentId: string };

function statusTone(status: RightsStatus): {
  Icon: typeof Shield;
  classes: string;
  blurb: string;
} {
  switch (status) {
    case "rights_transferred_to_student":
    case "parent_guardian_authorized_by_student":
    case "student_shared_decision_making":
      return {
        Icon: ShieldCheck,
        classes: "bg-emerald-50 text-emerald-900 border-emerald-200",
        blurb: "Student decision-making rights recorded.",
      };
    case "under_18_parent_rights_active":
      return {
        Icon: Shield,
        classes: "bg-sky-50 text-sky-900 border-sky-200",
        blurb: "Parent/guardian holds education rights.",
      };
    case "approaching_transfer_of_rights":
      return {
        Icon: ShieldAlert,
        classes: "bg-amber-50 text-amber-900 border-amber-200",
        blurb: "Rights generally transfer at age 18 — plan ahead.",
      };
    case "legal_representative_or_conservator":
      return {
        Icon: Shield,
        classes: "bg-violet-50 text-violet-900 border-violet-200",
        blurb: "Legal representative is the rights holder.",
      };
    default:
      return {
        Icon: ShieldAlert,
        classes: "bg-muted text-muted-foreground border-border",
        blurb: "Review who holds education rights for this student.",
      };
  }
}

export function RightsStatusCard({ studentId }: Props) {
  const { user, loading } = useAuth();
  if (loading || !user?.id) return null;
  return <RightsStatusSession key={`${user.id}:${studentId}`} studentId={studentId} viewerId={user.id} />;
}
function RightsStatusSession({ studentId, viewerId }: Props & { viewerId: string }) {
  const fetchStatus = useServerFn(getRightsStatus);
  const saveStatus = useServerFn(setRightsStatus);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [revision, setRevision] = useState<string | null>(null);
  const session = useRef({ alive: true, load: 0, saving: false });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RightsStatus>("unknown_needs_review");
  const [latest, setLatest] = useState<RightsTransferRow | null>(null);
  const [age, setAge] = useState<number | null>(null);

  // Form state
  const [formStatus, setFormStatus] = useState<RightsStatus>("unknown_needs_review");
  const [transferDate, setTransferDate] = useState("");
  const [authorizedParent, setAuthorizedParent] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [legalNotes, setLegalNotes] = useState("");

  const refresh = async () => {
    const current = session.current;
    const serial = ++current.load;
    setLoading(true); setLoadError(false);
    try {
      const res = await fetchStatus({ data: { student_id: studentId, expected_viewer_id: viewerId } });
      if (!current.alive || serial !== current.load) return;
      setStatus(res.student.rights_status); setRevision(res.student.rights_status_revision);
      setLatest(res.latest); setAge(res.student.age ?? null); setCanEdit(res.can_edit); setNeedsReview(res.needs_review);
      setFormStatus(res.student.rights_status); setTransferDate(res.latest?.transfer_notice_date ?? "");
      setAuthorizedParent(res.latest?.student_authorized_parent_access ?? false);
      setDecisionNotes(res.latest?.decision_making_notes ?? ""); setLegalNotes(res.latest?.legal_representative_notes ?? "");
      setNeedsRefresh(false);
    } catch {
      if (!current.alive || serial !== current.load) return;
      setLoadError(true); setCanEdit(false); setRevision(null); setNeedsRefresh(true);
    } finally { if (current.alive && serial === current.load) setLoading(false); }
  };
  useEffect(() => {
    const current = session.current; current.alive = true; void refresh();
    return () => { current.alive = false; current.load++; };
    // The keyed session fixes viewer/student identity for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onSave = async () => {
    const current = session.current;
    if (current.saving || loading || loadError || needsRefresh || !canEdit || !revision) return;
    current.saving = true; setSaving(true);
    try {
      await saveStatus({ data: {
        student_id: studentId, expected_viewer_id: viewerId, expected_revision: revision, request_id: crypto.randomUUID(),
        current_status: formStatus, transfer_notice_date: transferDate || null, student_authorized_parent_access: authorizedParent,
        decision_making_notes: decisionNotes || null, legal_representative_notes: legalNotes || null,
      } });
      if (!current.alive) return;
      toast.success("Rights review recorded"); setOpen(false); await refresh();
    } catch {
      if (!current.alive) return;
      setNeedsRefresh(true); toast.error("We couldn't confirm this review. Refresh the status before trying again.");
    } finally { if (current.alive) { current.saving = false; setSaving(false); } }
  };

  const tone = statusTone(status);
  const Icon = tone.Icon;
  const showAge17Reminder = age !== null && age >= 17 && status !== "rights_transferred_to_student";

  return (
    <div className={`mt-4 rounded-2xl border p-4 ${tone.classes}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">Education rights status</p>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium">
              {loading ? "Loading…" : loadError ? "Status Unavailable" : RIGHTS_STATUS_LABELS[status]}
            </span>
          </div>
          {!loading && !loadError && <p className="mt-1 text-xs opacity-90">{tone.blurb}</p>}
          {(loadError || needsRefresh) && <div className="mt-2 text-xs" role="status">
            Refresh to confirm your sign-in, access and current review before continuing.
            <Button size="sm" variant="outline" className="ml-2" disabled={loading || saving} onClick={() => void refresh()}>Refresh Status</Button>
          </div>}
          {needsReview && !loading && !loadError && <p className="mt-2 text-xs">An earlier review does not match this status. Record a new review to reconcile it.</p>}
          {!loading && !loadError && showAge17Reminder && (
            <p className="mt-2 text-xs font-medium">
              Reminder: education rights generally transfer to the student at age 18 in Connecticut.
              Talk with the team about transfer-of-rights notice and any continued parent/guardian
              involvement the student wants to authorize.
            </p>
          )}
          {!loading && !loadError && latest && (
            <p className="mt-2 text-xs opacity-70">
              Last reviewed {new Date(latest.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary" disabled={loading || loadError || !canEdit || needsRefresh}>
              Review
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review education rights status</DialogTitle>
              <DialogDescription>
                Record who holds education decision-making rights for this student. This is a
                planning note — it is not legal advice. Check district or official guidance for
                anything you're unsure about. Saving this status does not change anyone's
                access to documents. Review document sharing separately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-xs">Current status</Label>
                <select
                  disabled={saving || loading || needsRefresh}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as RightsStatus)}
                >
                  {RIGHTS_STATUS_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {RIGHTS_STATUS_LABELS[v]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="transfer-date" className="text-xs">
                  Transfer notice date (optional)
                </Label>
                <Input
                  id="transfer-date"
                  disabled={saving || loading || needsRefresh}
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                />
              </div>

              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  disabled={saving || loading || needsRefresh}
                  checked={authorizedParent}
                  onCheckedChange={(c) => setAuthorizedParent(c === true)}
                />
                <span>
                  Record that the student has authorized continued parent/guardian involvement after age 18
                </span>
              </label>

              <div>
                <Label htmlFor="decision-notes" className="text-xs">
                  Decision-making notes (optional)
                </Label>
                <Textarea
                  id="decision-notes"
                  maxLength={2000}
                  disabled={saving || loading || needsRefresh}
                  rows={2}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="e.g. shared decision-making with parent; supported decision-making agreement on file"
                />
              </div>

              <div>
                <Label htmlFor="legal-notes" className="text-xs">
                  Legal representative notes (optional)
                </Label>
                <Textarea
                  id="legal-notes"
                  maxLength={2000}
                  disabled={saving || loading || needsRefresh}
                  rows={2}
                  value={legalNotes}
                  onChange={(e) => setLegalNotes(e.target.value)}
                  placeholder="e.g. conservatorship, power of attorney — keep a note for the team"
                />
              </div>

              {needsRefresh && <div className="text-xs" role="status">
                Refresh the current status before another save.
                <Button variant="outline" size="sm" disabled={loading || saving} onClick={() => void refresh()}>Refresh Current Review</Button>
              </div>}
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                TransitionForward does not provide legal advice and does not replace official IEP,
                PPT team, or district decisions. Please verify rights status with your school team
                or appropriate counsel.
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={onSave} disabled={saving || loading || loadError || needsRefresh || !canEdit || !revision}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
