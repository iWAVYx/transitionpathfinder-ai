import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Sparkles,
  Target,
  Loader2,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { CollaboratorsPanel } from "@/components/students/CollaboratorsPanel";
import { supabase } from "@/integrations/supabase/client";
import { getStudent, listGoals, type Student, type Goal } from "@/lib/students.functions";
import {
  listDocuments,
  registerDocument,
  deleteDocument,
  getDocumentSignedUrl,
  extractGoalsFromText,
  saveExtractedGoals,
  type DocumentRow,
  type ExtractedGoal,
} from "@/lib/documents.functions";

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  head: () => ({ meta: [{ title: "Student — TransitionForward" }] }),
  component: StudentDetailPage,
});

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjs as any).GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.mjs`;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  const max = Math.min(doc.numPages, 40);
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n\n";
  }
  return out;
}

function StudentDetailPage() {
  const { studentId } = Route.useParams();

  const fetchStudent = useServerFn(getStudent);
  const fetchDocs = useServerFn(listDocuments);
  const fetchGoals = useServerFn(listGoals);
  const register = useServerFn(registerDocument);
  const remove = useServerFn(deleteDocument);
  const sign = useServerFn(getDocumentSignedUrl);
  const extractGoals = useServerFn(extractGoalsFromText);
  const saveGoals = useServerFn(saveExtractedGoals);

  const [student, setStudent] = useState<Student | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState<string | null>(null);
  const [proposed, setProposed] = useState<{ docId: string; goals: ExtractedGoal[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    const [s, d, g] = await Promise.all([
      fetchStudent({ data: { id: studentId } }).catch(() => null),
      fetchDocs({ data: { student_id: studentId } }).catch(() => ({ documents: [] })),
      fetchGoals({ data: { student_id: studentId } }).catch(() => ({ goals: [] })),
    ]);
    setStudent(s);
    setDocs(d.documents);
    setGoals(g.goals);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function handleUpload(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File is too large (20MB max).");
      return;
    }
    setUploading(true);
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
          title: file.name.slice(0, 200),
          storage_path: path,
          mime_type: file.type || undefined,
          size_bytes: file.size,
          doc_type: "iep",
        },
      });
      toast.success("Document uploaded.");
      await reload();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDownload(doc: DocumentRow) {
    try {
      const { url } = await sign({ data: { id: doc.id } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Could not open file.");
    }
  }

  async function handleDelete(doc: DocumentRow) {
    if (!confirm(`Delete "${doc.title}"? This removes the file and its record.`)) return;
    await remove({ data: { id: doc.id } });
    await reload();
  }

  async function handleParse(doc: DocumentRow) {
    setParsing(doc.id);
    try {
      const { url } = await sign({ data: { id: doc.id } });
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], doc.title, { type: doc.mime_type ?? blob.type });
      let text = "";
      if ((doc.mime_type ?? "").includes("pdf") || doc.title.toLowerCase().endsWith(".pdf")) {
        text = await extractPdfText(file);
      } else {
        text = await file.text();
      }
      if (!text.trim()) {
        toast.error("Couldn't read text from this file.");
        return;
      }
      const out = await extractGoals({ data: { text } });
      if (!out.goals.length) {
        toast.info("No goals detected in this document.");
        return;
      }
      setProposed({ docId: doc.id, goals: out.goals });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Couldn't parse goals.");
    } finally {
      setParsing(null);
    }
  }

  async function handleSaveGoals() {
    if (!proposed) return;
    setSaving(true);
    try {
      const { inserted } = await saveGoals({
        data: { student_id: studentId, goals: proposed.goals },
      });
      toast.success(`Added ${inserted} goal${inserted === 1 ? "" : "s"}.`);
      setProposed(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save goals.");
    } finally {
      setSaving(false);
    }
  }

  function toggleProposed(idx: number) {
    if (!proposed) return;
    setProposed({
      ...proposed,
      goals: proposed.goals.filter((_, i) => i !== idx),
    });
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Students", to: "/students" },
            { label: student ? student.first_name : "…" },
          ]}
        />
      </div>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Student</p>
            <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">
              {student ? `${student.first_name} ${student.last_name ?? ""}` : "Loading…"}
            </h1>
            {student && (
              <p className="mt-2 text-sm text-muted-foreground">
                {student.grade_band ?? "Grade not set"}
                {student.school ? ` · ${student.school}` : ""}
              </p>
            )}
          </div>
          <Link
            to="/students"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← All students
          </Link>
        </header>

        {/* DOCUMENTS */}
        <div className="mt-10 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">Documents</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Store IEPs, evaluations, and transition plans privately. Only you and people you
                invite can see them.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-shadow hover:shadow-lift disabled:opacity-50">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Upload document
                </>
              )}
            </label>
          </div>

          <ul className="mt-5 divide-y rounded-xl border">
            {docs.length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">
                No documents yet. Upload an IEP to extract goals automatically.
              </li>
            ) : (
              docs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {(d.size_bytes ?? 0) > 0
                          ? `${Math.round((d.size_bytes ?? 0) / 1024)} KB · `
                          : ""}
                        {new Date(d.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleParse(d)}
                      disabled={parsing === d.id}
                    >
                      {parsing === d.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" /> Extract goals
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDownload(d)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(d)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* PROPOSED GOALS */}
        {proposed && (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl">Goals we found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review and remove any you don't want before saving. Nothing is added until you click
                  Save.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setProposed(null)}>
                Cancel
              </Button>
            </div>
            <ul className="mt-4 space-y-3">
              {proposed.goals.map((g, i) => (
                <li
                  key={`${g.title}-${i}`}
                  className="flex items-start justify-between gap-3 rounded-xl border bg-background p-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{g.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                      {g.category}
                    </p>
                    {g.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{g.description}</p>
                    )}
                    {g.measurable_criteria && (
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        How we'll measure: {g.measurable_criteria}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => toggleProposed(i)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSaveGoals} disabled={saving || proposed.goals.length === 0}>
                {saving ? "Saving…" : `Save ${proposed.goals.length} goal${proposed.goals.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        )}

        {/* GOALS */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">Goals</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Saved goals for {student?.first_name ?? "this student"}.
              </p>
            </div>
            <Target className="h-5 w-5 text-muted-foreground" />
          </div>
          {goals.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
              No goals yet. Upload an IEP above and we'll suggest a starting set.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {goals.map((g) => (
                <li key={g.id} className="rounded-xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{g.title}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {g.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {g.category}
                  </p>
                  {g.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{g.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6">
          <CollaboratorsPanel studentId={studentId} />
        </div>
      </section>
    </SiteShell>
  );
}
