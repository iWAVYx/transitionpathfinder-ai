import { readUploadInterruption, rememberUploadInterruption, forgetCompletedUploadInterruption, confirmedInterruptedUploadOutcome } from "@/lib/document-upload-interruption";
import { confirmDocumentUploadReservation } from "@/lib/document-upload-intent";
import { documentUploadFingerprint } from "@/lib/document-upload-fingerprint";
import { documentUploadOutcome, DOCUMENT_UPLOAD_UNCONFIRMED } from "@/lib/document-upload-outcome";
import { useEffect, useRef, useState } from "react";
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
import {
  assertCanUploadForStudent,
  registerDocument,
  reserveDocumentUpload,
  recoverDocumentUpload,
  recoverInterruptedDocumentUpload,
  type DocumentRow,
} from "@/lib/documents.functions";
import {
  PROTECTED_FILE_UPLOADS_ENABLED,
  PROTECTED_FILE_UPLOADS_MESSAGE,
} from "@/lib/protected-file-uploads";
import {
  SensitiveFilePrivacyReviewDialog,
} from "@/components/privacy/SensitiveFilePrivacyReviewDialog";
import type { SensitiveFileReviewSource } from "@/lib/sensitive-file-review.browser";
import { assertPrivacySafeDerivedUpload } from "@/lib/sensitive-text-redaction";
import { formatDocumentTypeLabel } from "@/lib/document-display";
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
  viewerId: string;
  studentId: string;
  studentFirstName: string | null;
  studentLastName?: string | null;
  studentSchool?: string | null;
  studentDateOfBirth?: string | null;
  docs: DocumentRow[];
  onChange: () => void | Promise<void>;
  /** Optional row-level actions (download, extract, delete) rendered by parent. */
  renderRowActions?: (doc: DocumentRow) => React.ReactNode;
  /** When false, the upload form is hidden and a view-only banner is shown.
   *  Default true preserves existing call sites; the student profile passes
   *  the real value from `canEditStudent`. */
  canEdit?: boolean;
};

export function FamilyDocumentUpload(props: Props) {
  // A new student, account or edit entitlement starts a fresh review session.
  // Pending work from the previous session may finish, but cannot advance it.
  return <FamilyDocumentUploadSession key={`${props.viewerId}:${props.studentId}:${props.canEdit === false ? "view" : "edit"}`} {...props} />;
}

function FamilyDocumentUploadSession({
  viewerId,
  studentId,
  studentFirstName,
  studentLastName,
  studentSchool,
  studentDateOfBirth,
  docs,
  onChange,
  renderRowActions,
  canEdit = true,
}: Props) {
  const register = useServerFn(registerDocument);
  const reserve = useServerFn(reserveDocumentUpload);
  const recover = useServerFn(recoverDocumentUpload);
  const recoverInterrupted = useServerFn(recoverInterruptedDocumentUpload);
  const assertCanUpload = useServerFn(assertCanUploadForStudent);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const uploadPending = useRef(false);
  // Start blocked until this tab's reminder has been checked after hydration.
  const uploadUnconfirmed = useRef(true);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const interruptedAttempt = useRef<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const statusCheckPending = useRef(false);

  async function checkInterruptedUpload(attempt: string) {
    if (!active.current || statusCheckPending.current || !canEdit || !PROTECTED_FILE_UPLOADS_ENABLED) return;
    statusCheckPending.current = true;
    setCheckingStatus(true);
    try {
      const result = await recoverInterrupted({ data: { student_id: studentId, attempt_id: attempt, expected_viewer_id: viewerId } });
      if (!active.current || interruptedAttempt.current !== attempt) return;
      if (confirmedInterruptedUploadOutcome(result, viewerId, studentId, attempt) === "uncertain" ||
          !forgetCompletedUploadInterruption(viewerId, studentId, attempt)) return;
      interruptedAttempt.current = null;
      uploadUnconfirmed.current = false;
      setUnconfirmed(false);
      try { await onChange(); } catch {
        if (active.current) toast.error("The upload result is confirmed, but the document list couldn't be refreshed. Refresh this page to view its current status.");
      }
    } catch { /* No automatic replay or absence-based reset. Keep the reminder. */ }
    finally { statusCheckPending.current = false; if (active.current) setCheckingStatus(false); }
  }
  useEffect(() => {
    const previous = readUploadInterruption(viewerId, studentId);
    uploadUnconfirmed.current = previous.state !== "clear";
    setUnconfirmed(previous.state !== "clear");
    interruptedAttempt.current = previous.state === "pending" ? previous.attemptId : null;
    if (previous.state === "pending") void checkInterruptedUpload(previous.attemptId);
    // The keyed component gives each viewer/student/access session its own
    // lifetime. A departed session cannot clear this or the next session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerId, studentId]);
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
  const [privacySource, setPrivacySource] = useState<SensitiveFileReviewSource | null>(null);

  async function upload(file: File, consentAcknowledged = consent) {
    if (!active.current || uploadPending.current || uploadUnconfirmed.current || !canEdit) return;
    if (!PROTECTED_FILE_UPLOADS_ENABLED) {
      toast.error(PROTECTED_FILE_UPLOADS_MESSAGE);
      return;
    }
    try {
      assertPrivacySafeDerivedUpload(file.name, file.type);
    } catch {
      toast.error("Please approve the privacy-safe text copy before uploading.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That file is over 20 MB. Try a smaller export or split it.");
      return;
    }
    if (!consentAcknowledged) {
      setPendingFile(file);
      toast.error("Please confirm the privacy notice below before uploading.");
      return;
    }
    // Capture the reviewed metadata before asynchronous work; later edits cannot
    // silently change this attempt's review/registration intent.
    const details = {
      student_id: studentId,
      expected_viewer_id: viewerId,
      title: (title.trim() || file.name).slice(0, 200),
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
    };
    uploadPending.current = true;
    setBusy(true);
    let writeAttempted = false;
    let reservationAttempted = false;
    let prepared = false;
    function pauseUnconfirmed() {
      uploadUnconfirmed.current = true;
      setUnconfirmed(true);
      toast.error(DOCUMENT_UPLOAD_UNCONFIRMED);
    }
    try {
      const contentHash = await documentUploadFingerprint(file);
      if (!active.current) return;
      prepared = true;
      const permission = await assertCanUpload({ data: { student_id: studentId, expected_viewer_id: viewerId, content_hash: contentHash } });
      if (!active.current) return;
      if (permission?.ok !== true || (permission.duplicate !== undefined && typeof permission.duplicate !== "boolean")) throw new Error("Unconfirmed upload permission");
      if (permission.duplicate === true) {
        toast.info("This file is already in this student's documents. Review the existing file; your new upload details have not been saved.");
        try { await onChange(); } catch {
          if (active.current) toast.error("We found the existing file, but couldn't refresh the document list. Refresh this page to review it.");
        }
        return;
      }
      const attemptId = crypto.randomUUID();
      const intent = { ...details, content_hash: contentHash, attempt_id: attemptId };
      // Persist only the attempt ID before the first possible backend write.
      // Failure to retain progress must stop before reservation, not after it.
      if (!rememberUploadInterruption(viewerId, studentId, attemptId)) {
        pauseUnconfirmed();
        return;
      }
      interruptedAttempt.current = attemptId;
      reservationAttempted = true;
      const reserved = await reserve({ data: intent });
      if (!active.current) return;
      const reservation = confirmDocumentUploadReservation(reserved, viewerId, studentId, attemptId);
      const path = reservation.storage_path;
      writeAttempted = true;
      const { error: upErr } = await supabase.storage
        .from("student-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (!active.current) return;
      if (upErr) throw upErr;
      let receipt: unknown;
      try {
        receipt = await register({ data: {
          ...intent, storage_path: path,
          upload_attempt_id: attemptId,
          upload_review_context_sha256: reservation.review_context_sha256,
        } });
      } catch { receipt = null; }
      if (!active.current) return;
      // One read-only reconciliation. Never repeat upload, scan or generation.
      if (documentUploadOutcome(receipt, studentId, path) === "uncertain") {
        try { receipt = await recover({ data: { ...intent, review_context_sha256: reservation.review_context_sha256 } }); }
        catch { receipt = null; }
        if (!active.current) return;
      }
      const outcome = documentUploadOutcome(receipt, studentId, path);
      if (outcome === "uncertain" || outcome === "pending" ||
          !forgetCompletedUploadInterruption(viewerId, studentId, attemptId)) {
        pauseUnconfirmed();
        return;
      }
      interruptedAttempt.current = null;
      if (outcome === "blocked") {
        toast.error("This file could not be cleared for use. Review its status before trying again.");
      } else {
        toast.success("Document saved. Review its status in the document list.");
      }
      setTitle("");
      setSchoolYear("");
      setMeetingDate("");
      setReviewDate("");
      setAnnualReviewDate("");
      setReevaluationDate("");
      setNotes("");
      setSource("");
      setPendingFile(null);
      try {
        await onChange();
      } catch {
        if (!active.current) return;
        toast.error("The upload result is confirmed, but the document list couldn't be refreshed. Refresh this page to view its current status.");
      }
    } catch {
      if (!active.current) return;
      // Do not expose filenames, storage paths or private service errors.
      // A lost write response does not prove that no file or row was saved.
      if (writeAttempted || reservationAttempted) pauseUnconfirmed();
      else if (!prepared) toast.error("We couldn't prepare this privacy-safe copy. Choose it again before continuing.");
      else toast.error("We couldn't confirm permission to upload. Refresh the page and check your access before continuing.");
    } finally {
      uploadPending.current = false;
      if (active.current) {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    }
  }


  const activeType = DOC_TYPES.find((t) => t.value === docType)!;
  const firstName = studentFirstName ?? "your student";

  return (
    <div
      className="rounded-2xl border bg-card shadow-soft"
      data-testid="student-document-panel"
    >
      {/* Header */}
      <div className="border-b p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
              Documents for {firstName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {PROTECTED_FILE_UPLOADS_ENABLED
                ? `Upload IEPs, evaluations, and plans. Files stay private to ${firstName}'s team — you decide who sees them.`
                : `Review the documents already stored for ${firstName}. New file uploads are paused while private security scanning is finalized.`}
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

      {canEdit && !PROTECTED_FILE_UPLOADS_ENABLED && (
        <div
          role="status"
          className="flex items-start gap-2.5 border-b bg-amber-50/60 px-5 py-4 text-sm leading-relaxed text-amber-950 dark:bg-amber-950/30 dark:text-amber-100 sm:px-6"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Document uploads are temporarily paused.</strong>{" "}
            {PROTECTED_FILE_UPLOADS_MESSAGE} You can continue using the student dashboard and
            reviewing documents that are already available.
          </p>
        </div>
      )}

      {canEdit && PROTECTED_FILE_UPLOADS_ENABLED && (
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
              placeholder="e.g. Current IEP — 2026-27"
              maxLength={200}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Use a generic title without a last name or student ID. Leave blank to use the
              privacy-safe file name.
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
                void upload(f, true);
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
            busy || unconfirmed ? "opacity-60" : "cursor-pointer hover:border-primary/60 hover:bg-primary/[0.03]"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            className="hidden"
            disabled={busy || unconfirmed}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (f.size > MAX_BYTES) {
                  toast.error("That file is over 20 MB. Try a smaller export or split it.");
                } else {
                  setPrivacySource({ kind: "file", file: f });
                }
              }
              e.target.value = "";
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
                Text-based PDF or plain text · up to 20 MB
              </p>
            </>
          )}
        </label>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Before anything is saved, TransitionForward redacts detected personal identifiers from a
          local text copy and shows the privacy-safe result for your approval. Files are stored
          privately and only available to {firstName}'s team. We log every download to an audit
          trail you can review. Only the text-only copy you approve is saved; the original file and
          its hidden metadata are not uploaded.
        </p>
      </div>
      </>
      )}




      {unconfirmed && (
        <div role="alert" className="border-t px-5 py-3 text-sm text-amber-950 dark:text-amber-100 sm:px-6">
          <p>An earlier upload still needs confirmation. You can review existing documents while it is checked. Uploading again will stay paused until its result is confirmed.</p>
          {interruptedAttempt.current && <Button type="button" variant="outline" size="sm" className="mt-2" disabled={checkingStatus || busy} onClick={() => void checkInterruptedUpload(interruptedAttempt.current!)}>
            {checkingStatus ? "Checking Upload Status…" : "Check Upload Status"}
          </Button>}
        </div>
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
            {PROTECTED_FILE_UPLOADS_ENABLED
              ? "Nothing uploaded yet. Start with the most recent IEP if you have it."
              : "Nothing is stored here yet. Uploads will return after private security scanning is verified."}
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
                      <span className="capitalize">{formatDocumentTypeLabel(d.doc_type)}</span>
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
      <SensitiveFilePrivacyReviewDialog
        source={privacySource}
        context={{
          studentFirstName,
          studentLastName,
          schoolName: studentSchool,
          dateOfBirth: studentDateOfBirth,
        }}
        confirmLabel="Approve privacy-safe copy"
        onCancel={() => setPrivacySource(null)}
        onConfirm={({ file }) => {
          setPrivacySource(null);
          void upload(file);
        }}
      />
    </div>
  );
}

/** Standard row action set the student page uses. Exported so other surfaces can reuse. */
export function StandardDocActions({
  doc,
  parsing,
  onExtract,
  extractionDisabled = false,
  onDownload,
  onDelete,
}: {
  doc: DocumentRow;
  parsing?: string | null;
  onExtract?: (doc: DocumentRow) => void;
  extractionDisabled?: boolean;
  onDownload: (doc: DocumentRow) => void;
  onDelete?: (doc: DocumentRow) => void;
}) {
  const [permsOpen, setPermsOpen] = useState(false);
  return (
    <>
      {onExtract && ["iep", "current-iep", "previous-iep", "transition-plan"].includes(doc.doc_type) ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onExtract(doc)}
          disabled={!!parsing || extractionDisabled}
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
      {onDelete && (
        <Button size="sm" variant="ghost" onClick={() => onDelete(doc)} aria-label="Delete">
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      )}
      <DocumentPermissionsDialog
        open={permsOpen}
        onOpenChange={setPermsOpen}
        document={doc}
      />
    </>
  );
}
