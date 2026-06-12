import { useEffect, useState } from "react";
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
        blurb: "Student controls sharing.",
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
  const fetchStatus = useServerFn(getRightsStatus);
  const saveStatus = useServerFn(setRightsStatus);

  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    try {
      const res = await fetchStatus({ data: { student_id: studentId } });
      setStatus(res.student.rights_status);
      setLatest(res.latest);
      setAge(res.student.age ?? null);
      setFormStatus(res.student.rights_status);
      setTransferDate(res.latest?.transfer_notice_date ?? "");
      setAuthorizedParent(res.latest?.student_authorized_parent_access ?? false);
      setDecisionNotes(res.latest?.decision_making_notes ?? "");
      setLegalNotes(res.latest?.legal_representative_notes ?? "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveStatus({
        data: {
          student_id: studentId,
          current_status: formStatus,
          transfer_notice_date: transferDate || null,
          student_authorized_parent_access: authorizedParent,
          decision_making_notes: decisionNotes || null,
          legal_representative_notes: legalNotes || null,
        },
      });
      toast.success("Rights status updated");
      setOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
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
              {loading ? "…" : RIGHTS_STATUS_LABELS[status]}
            </span>
          </div>
          <p className="mt-1 text-xs opacity-90">{tone.blurb}</p>
          {showAge17Reminder && (
            <p className="mt-2 text-xs font-medium">
              Reminder: education rights generally transfer to the student at age 18 in Connecticut.
              Talk with the team about transfer-of-rights notice and any continued parent/guardian
              involvement the student wants to authorize.
            </p>
          )}
          {latest && (
            <p className="mt-2 text-xs opacity-70">
              Last reviewed {new Date(latest.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary">
              Review
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review education rights status</DialogTitle>
              <DialogDescription>
                Record who holds education decision-making rights for this student. This is a
                planning note — it is not legal advice. Check district or official guidance for
                anything you're unsure about.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-xs">Current status</Label>
                <select
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
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                />
              </div>

              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={authorizedParent}
                  onCheckedChange={(c) => setAuthorizedParent(c === true)}
                />
                <span>
                  Student has authorized continued parent/guardian access after age 18
                </span>
              </label>

              <div>
                <Label htmlFor="decision-notes" className="text-xs">
                  Decision-making notes (optional)
                </Label>
                <Textarea
                  id="decision-notes"
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
                  rows={2}
                  value={legalNotes}
                  onChange={(e) => setLegalNotes(e.target.value)}
                  placeholder="e.g. conservatorship, power of attorney — keep a note for the team"
                />
              </div>

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
              <Button onClick={onSave} disabled={saving}>
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
