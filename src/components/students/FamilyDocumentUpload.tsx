import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Loader2,
  ShieldCheck,
  Info,
  GraduationCap,
  ClipboardCheck,
  Compass,
  Folder,
  CheckCircle2,
  Sparkles,
  Download,
  Trash2,
  Users as UsersIcon,
  ListChecks,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { registerDocument, type DocumentRow } from "@/lib/documents.functions";
import { DocumentPermissionsDialog } from "./DocumentPermissionsDialog";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB


type DocType =
  | "current-iep"
  | "previous-iep"
  | "transition-plan"
  | "evaluation"
  | "progress-report"
  | "meeting-notes"
  | "other";

const DOC_TYPES: { value: DocType; label: string; icon: React.ReactNode; help: string }[] = [
  {
    value: "current-iep",
    label: "Current IEP",
    icon: <GraduationCap className="h-4 w-4" />,
    help: "The IEP currently in effect. We focus on the transition pages and post-secondary goals.",
  },
  {
    value: "previous-iep",
    label: "Previous IEP",
    icon: <GraduationCap className="h-4 w-4" />,
    help: "An earlier IEP — useful for tracking progress over time.",
  },
  {
    value: "transition-plan",
    label: "Transition plan / SOP",
    icon: <Compass className="h-4 w-4" />,
    help: "Summary of Performance (SOP), Section 504 plan, or any transition planning doc.",
  },
  {
    value: "evaluation",
    label: "Evaluation or assessment",
    icon: <ClipboardCheck className="h-4 w-4" />,
    help: "Psych-ed, OT/PT, speech, vocational, or other school-team evaluations.",
  },
  {
    value: "progress-report",
    label: "Progress report",
    icon: <ListChecks className="h-4 w-4" />,
    help: "Quarterly or annual progress on IEP goals.",
  },
  {
    value: "meeting-notes",
    label: "Meeting notes",
    icon: <UsersIcon className="h-4 w-4" />,
    help: "PPT / IEP meeting notes, parent input, or follow-ups.",
  },
  {
    value: "other",
    label: "Something else",
    icon: <Folder className="h-4 w-4" />,
    help: "Behavior plan, medical letter, agency referral — anything the team should see.",
  },
];

const GUIDANCE = [
  {
    title: "Most recent IEP",
    detail: "Especially the transition planning pages (age 14+ in CT).",
  },
  {
    title: "Recent evaluations",
    detail: "Psych-ed, speech, OT/PT, vocational assessments from the last 3 years.",
  },
  {
    title: "Summary of Performance",
    detail: "If your student is graduating or aging out, the SOP captures what they bring forward.",
  },
  {
    title: "Outside reports",
    detail: "Private evaluations, agency referrals (BRS, DDS), or medical letters that affect planning.",
  },
];

type Props = {
  studentId: string;
  studentFirstName: string | null;
  docs: DocumentRow[];
  onChange: () => void | Promise<void>;
  /** Optional row-level actions (download, extract, delete) rendered by parent. */
  renderRowActions?: (doc: DocumentRow) => React.ReactNode;
  /** When false, the upload form is hidden and a view-only banner is shown.
   *  Default true preserves existing call sites; the student profile passes
   *  the real value from `canEditStudent`. */
  canEdit?: boolean;
};

export function FamilyDocumentUpload({
  studentId,
  studentFirstName,
  docs,
  onChange,
  renderRowActions,
  canEdit = true,
}: Props) {
  const register = useServerFn(registerDocument);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState<DocType>("current-iep");
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "team" | "family" | "student">("team");
  const [schoolYear, setSchoolYear] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [annualReviewDate, setAnnualReviewDate] = useState("");
  const [reevaluationDate, setReevaluationDate] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("");
  const [consent, setConsent] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("That file is over 20 MB. Try a smaller export or split it.");
      return;
    }
    if (!consent) {
      setPendingFile(file);
      toast.error("Please confirm the privacy notice below before uploading.");
      return;
    }
    setBusy(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const path = `${studentId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("student-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      await register({
        data: {
          student_id: studentId,
          title: (title.trim() || file.name).slice(0, 200),
          storage_path: path,
          mime_type: file.type || undefined,
          size_bytes: file.size,
          doc_type: docType,
          visibility,
          school_year: schoolYear.trim() || undefined,
          meeting_date: meetingDate || undefined,
          review_date: reviewDate || undefined,
          annual_review_date: annualReviewDate || undefined,
          reevaluation_date: reevaluationDate || undefined,
          notes: notes.trim() || undefined,
          source: source.trim() || undefined,
          consent_acknowledged: true,
        },
      });
      toast.success("Document uploaded. Only people you've granted access can see it.");
      setTitle("");
      setSchoolYear("");
      setMeetingDate("");
      setReviewDate("");
      setAnnualReviewDate("");
      setReevaluationDate("");
      setNotes("");
      setSource("");
      setPendingFile(null);
      await onChange();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }


  const activeType = DOC_TYPES.find((t) => t.value === docType)!;
  const firstName = studentFirstName ?? "your student";

  return (
    <div className="rounded-2xl border bg-card shadow-soft">
      {/* Header */}
      <div className="border-b p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
              Documents for {firstName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload IEPs, evaluations, and plans. Files stay private to {firstName}'s team —
              you decide who sees them.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck className="h-3 w-3" /> Private
          </span>
        </div>
      </div>

      {!canEdit && (
        <div className="flex items-start gap-2.5 border-b bg-amber-50/60 px-5 py-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 sm:px-6">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>View only.</strong> You can read and download {firstName}'s documents, but
            you don't have edit access on this student. Ask the family or the case manager to
            grant you <em>editor</em> access if you need to upload, replace, or delete files.
          </p>
        </div>
      )}

      {canEdit && (
      <>
      {/* Guidance */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 border-b bg-muted/30 px-5 py-3 text-left text-sm font-medium hover:bg-muted/50 sm:px-6">
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            What helps us most
          </span>
          <span className="text-xs text-muted-foreground">tap to hide</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-3 border-b p-5 sm:grid-cols-2 sm:p-6">
            {GUIDANCE.map((g) => (
              <div
                key={g.title}
                className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background p-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{g.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{g.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 border-b bg-amber-50/50 px-5 py-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 sm:px-6">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              After uploading an IEP, tap <strong>Extract goals</strong> on the file row to turn
              the transition pages into family-friendly goals you can review before saving.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Upload form */}
      <div className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="doc-type" className="mb-1.5 inline-block">
              What kind of document is this?
            </Label>
            <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
              <SelectTrigger id="doc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      {t.icon}
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{activeType.help}</p>
          </div>
          <div>
            <Label htmlFor="doc-title" className="mb-1.5 inline-block">
              Short title (optional)
            </Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder={`e.g. ${firstName} — IEP 2026-27`}
              maxLength={200}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Leave blank to use the file's name.
            </p>
          </div>
        </div>

        {/* Optional metadata */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="doc-year" className="mb-1.5 inline-block text-xs">
              School year (optional)
            </Label>
            <Input
              id="doc-year"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value.slice(0, 20))}
              placeholder="e.g. 2026-27"
            />
          </div>
          <div>
            <Label htmlFor="doc-meeting" className="mb-1.5 inline-block text-xs">
              Meeting date (optional)
            </Label>
            <Input
              id="doc-meeting"
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="doc-review" className="mb-1.5 inline-block text-xs">
              Next review (optional)
            </Label>
            <Input
              id="doc-review"
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
            />
          </div>
        </div>


        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="doc-annual" className="mb-1.5 inline-block text-xs">
              Annual review date (optional)
            </Label>
            <Input
              id="doc-annual"
              type="date"
              value={annualReviewDate}
              onChange={(e) => setAnnualReviewDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="doc-reeval" className="mb-1.5 inline-block text-xs">
              Reevaluation date (optional)
            </Label>
            <Input
              id="doc-reeval"
              type="date"
              value={reevaluationDate}
              onChange={(e) => setReevaluationDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="doc-source" className="mb-1.5 inline-block text-xs">
              Source (optional)
            </Label>
            <Input
              id="doc-source"
              value={source}
              onChange={(e) => setSource(e.target.value.slice(0, 200))}
              placeholder="e.g. School district, private eval"
              maxLength={200}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="doc-notes" className="mb-1.5 inline-block text-xs">
            Notes (optional)
          </Label>
          <Input
            id="doc-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
            placeholder="Anything the team should know about this file"
            maxLength={2000}
          />
        </div>


        <div>
          <Label htmlFor="doc-visibility" className="mb-1.5 inline-block">
            Who should see this?
          </Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
            <SelectTrigger id="doc-visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Just me</SelectItem>
              <SelectItem value="family">Family only</SelectItem>
              <SelectItem value="student">{firstName} and family</SelectItem>
              <SelectItem value="team">{firstName}'s full team (default)</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            You can grant individual people access at any time from the file row's
            <strong> Manage access</strong> button. Partners are never given IEPs.
          </p>
        </div>

        {/* Consent / privacy block */}
        <label className="flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50/50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <Checkbox
            checked={consent}
            onCheckedChange={(v) => {
              const next = v === true;
              setConsent(next);
              if (next && pendingFile) {
                const f = pendingFile;
                setPendingFile(null);
                upload(f);
              }
            }}
            className="mt-0.5"
            aria-label="Acknowledge privacy notice"
          />
          <span>
            I'm authorized to upload this document for {firstName}. I understand it will
            be stored privately, shared only with people I grant access to, and every download
            is recorded in an audit trail.
          </span>
        </label>

        <label
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background p-6 text-center transition-colors sm:p-8 ${
            busy ? "opacity-60" : "cursor-pointer hover:border-primary/60 hover:bg-primary/[0.03]"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          {busy ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-medium">Uploading…</p>
            </>
          ) : (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium">Tap to choose a file</p>
              <p className="text-xs text-muted-foreground">
                PDF, Word, or plain text · up to 20 MB
              </p>
            </>
          )}
        </label>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Files are stored privately and only available to {firstName}'s team. We log every
          download to an audit trail you can review.
        </p>
      </div>
      </>
      )}




      {/* File list */}
      <div className="border-t">
        <div className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Uploaded files
          </h3>
          <span className="text-xs text-muted-foreground">
            {docs.length} file{docs.length === 1 ? "" : "s"}
          </span>
        </div>
        {docs.length === 0 ? (
          <div className="px-5 pb-6 pt-1 text-center text-sm text-muted-foreground sm:px-6">
            Nothing uploaded yet. Start with the most recent IEP if you have it.
          </div>
        ) : (
          <ul className="divide-y border-t">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="capitalize">{d.doc_type.replace("-", " ")}</span>
                      {(d.size_bytes ?? 0) > 0
                        ? ` · ${Math.round((d.size_bytes ?? 0) / 1024)} KB`
                        : ""}
                      {" · "}
                      {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {renderRowActions ? (
                  <div className="flex flex-wrap items-center gap-1.5">{renderRowActions(d)}</div>
                ) : (
                  <span className="text-xs text-muted-foreground">No actions</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Standard row action set the student page uses. Exported so other surfaces can reuse. */
export function StandardDocActions({
  doc,
  parsing,
  onExtract,
  onDownload,
  onDelete,
}: {
  doc: DocumentRow;
  parsing?: string | null;
  onExtract: (doc: DocumentRow) => void;
  onDownload: (doc: DocumentRow) => void;
  onDelete?: (doc: DocumentRow) => void;
}) {
  const [permsOpen, setPermsOpen] = useState(false);
  return (
    <>
      {["iep", "current-iep", "previous-iep", "transition-plan"].includes(doc.doc_type) ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onExtract(doc)}
          disabled={parsing === doc.id}
        >
          {parsing === doc.id ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Extract goals
            </>
          )}
        </Button>
      ) : null}
      {["iep", "current-iep", "previous-iep", "transition-plan"].includes(doc.doc_type) ? (
        <Button size="sm" variant="ghost" asChild title="Review section by section">
          <Link to="/documents/$documentId/review" params={{ documentId: doc.id }}>
            <ListChecks className="h-3.5 w-3.5" /> Review
          </Link>
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setPermsOpen(true)}
        aria-label="Manage access"
        title="Manage access"
      >
        <UsersIcon className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onDownload(doc)} aria-label="Download">
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onDelete(doc)} aria-label="Delete">
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </Button>
      <DocumentPermissionsDialog
        open={permsOpen}
        onOpenChange={setPermsOpen}
        document={doc}
      />
    </>
  );
}

