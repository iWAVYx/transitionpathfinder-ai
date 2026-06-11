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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

type DocType = "iep" | "evaluation" | "transition-plan" | "other";

const DOC_TYPES: { value: DocType; label: string; icon: React.ReactNode; help: string }[] = [
  {
    value: "iep",
    label: "IEP (current or most recent)",
    icon: <GraduationCap className="h-4 w-4" />,
    help: "Full PDF preferred. We focus on the transition pages and post-secondary goals.",
  },
  {
    value: "evaluation",
    label: "Evaluation or assessment",
    icon: <ClipboardCheck className="h-4 w-4" />,
    help: "Psych-ed, OT/PT, speech, vocational, or other school-team evaluations.",
  },
  {
    value: "transition-plan",
    label: "Transition plan or summary",
    icon: <Compass className="h-4 w-4" />,
    help: "Summary of Performance (SOP), Section 504 plan, or any transition planning doc.",
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
};

export function FamilyDocumentUpload({
  studentId,
  studentFirstName,
  docs,
  onChange,
  renderRowActions,
}: Props) {
  const register = useServerFn(registerDocument);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState<DocType>("iep");
  const [title, setTitle] = useState("");

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("That file is over 20 MB. Try a smaller export or split it.");
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
        },
      });
      toast.success("Document uploaded. Only you and people you invite can see it.");
      setTitle("");
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
  onDelete: (doc: DocumentRow) => void;
}) {
  return (
    <>
      {doc.doc_type === "iep" || doc.doc_type === "transition-plan" ? (
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
      <Button size="sm" variant="ghost" onClick={() => onDownload(doc)} aria-label="Download">
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onDelete(doc)} aria-label="Delete">
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </Button>
    </>
  );
}
