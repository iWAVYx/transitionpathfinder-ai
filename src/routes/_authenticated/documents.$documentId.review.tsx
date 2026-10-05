import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Circle, Loader2, Sparkles, XCircle, HelpCircle, Pencil } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { TrustNote } from "@/components/site/TrustNote";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AIDisclaimer } from "@/components/site/AIDisclaimer";
import {
  EXTRACTION_SECTION_KEYS,
  getOrCreateExtraction,
  runExtractionFromText,
  updateExtractionSection,
  updateExtractionMeta,
  applyAcceptedExtraction,
  type ExtractionSectionKey,
  type ExtractionSection,
  type SectionReviewState,
} from "@/lib/extractions.functions";
import { logDocumentView } from "@/lib/documents.functions";
import { DocumentClassificationCard } from "@/components/documents/DocumentClassificationCard";
import { ExtractEvidenceButton } from "@/components/pathway/ExtractEvidenceButton";

export const Route = createFileRoute("/_authenticated/documents/$documentId/review")({
  component: withRoleGuard(["family", "educator", "admin"], ReviewPage),
});

const SECTION_LABELS: Record<ExtractionSectionKey, { label: string; hint: string }> = {
  student_first_name: { label: "Student name", hint: "First name only — no last name from the IEP." },
  grade_band: { label: "Grade band", hint: "9–10, 11–12, post-secondary, or not applicable." },
  strengths: { label: "Strengths", hint: "What the student does well." },
  interests: { label: "Interests", hint: "What the student enjoys or is curious about." },
  needs: { label: "Needs / areas of growth", hint: "Where the student needs support." },
  supports: { label: "Supports & accommodations", hint: "Accommodations, services, modifications." },
  transportation: { label: "Transportation", hint: "How the student gets to school / activities." },
  communication: { label: "Communication", hint: "Communication style, AAC, language preferences." },
  current_goals: { label: "Transition goals", hint: "Post-secondary / transition IEP goals." },
  family_concerns: { label: "Family concerns", hint: "Family priorities and concerns from the IEP." },
  student_voice: { label: "Student voice", hint: "What the student said about their own future." },
  educator_input: { label: "Educator input", hint: "Teacher / case manager observations." },
};

type Extraction = {
  id: string;
  document_id: string;
  student_id: string;
  status: string;
  sections: Record<string, ExtractionSection>;
  missing_information: string[];
  suggested_questions: string[];
  review_notes: string | null;
};

function ReviewPage() {
  const { documentId } = Route.useParams();
  const navigate = useNavigate();

  const fnGet = useServerFn(getOrCreateExtraction);
  const fnRun = useServerFn(runExtractionFromText);
  const fnSection = useServerFn(updateExtractionSection);
  const fnMeta = useServerFn(updateExtractionMeta);
  const fnApply = useServerFn(applyAcceptedExtraction);
  const fnLogView = useServerFn(logDocumentView);

  const [loading, setLoading] = useState(true);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fnGet({ data: { document_id: documentId } });
        setExtraction(res.extraction as unknown as Extraction);
        // Best-effort audit log; never block the page.
        fnLogView({ data: { document_id: documentId, context: "extraction_review" } }).catch(() => {});
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load extraction.");
      } finally {
        setLoading(false);
      }
    })();
  }, [documentId, fnGet, fnLogView]);

  const sections = useMemo(() => {
    const s = extraction?.sections ?? ({} as Record<string, ExtractionSection>);
    return EXTRACTION_SECTION_KEYS.map((k) => ({
      key: k,
      data: s[k] ?? { state: "pending" as SectionReviewState, value: "", original_value: "", notes: "" },
    }));
  }, [extraction]);

  const acceptedCount = sections.filter(
    (s) => s.data.state === "accepted" || s.data.state === "edited",
  ).length;
  const totalWithValue = sections.filter((s) => (s.data.original_value || "").trim().length > 0).length;

  async function handleRun() {
    if (!extraction) return;
    if (pastedText.trim().length < 40) {
      toast.error("Paste at least a paragraph of the IEP to extract from.");
      return;
    }
    setRunning(true);
    try {
      const res = await fnRun({ data: { document_id: documentId, text: pastedText } });
      setExtraction(res.extraction as unknown as Extraction);
      toast.success("Draft extracted — review each section below.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction failed.");
    } finally {
      setRunning(false);
    }
  }

  async function setSection(
    key: ExtractionSectionKey,
    patch: Partial<ExtractionSection>,
  ) {
    if (!extraction) return;
    const prev = extraction.sections[key] ?? {
      state: "pending" as SectionReviewState,
      value: "",
      original_value: "",
      notes: "",
    };
    const next: ExtractionSection = { ...prev, ...patch };
    setExtraction({
      ...extraction,
      sections: { ...extraction.sections, [key]: next },
    });
    try {
      await fnSection({
        data: {
          extraction_id: extraction.id,
          key,
          state: next.state,
          value: next.value,
          notes: next.notes,
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save change.");
    }
  }

  async function saveMeta(patch: Partial<Pick<Extraction, "missing_information" | "suggested_questions" | "review_notes">>) {
    if (!extraction) return;
    const next = { ...extraction, ...patch };
    setExtraction(next);
    try {
      await fnMeta({
        data: {
          extraction_id: extraction.id,
          missing_information: next.missing_information,
          suggested_questions: next.suggested_questions,
          review_notes: next.review_notes ?? "",
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save notes.");
    }
  }

  async function handleApply() {
    if (!extraction) return;
    setApplying(true);
    try {
      await fnApply({ data: { extraction_id: extraction.id } });
      toast.success("Accepted sections saved to the student profile.");
      navigate({ to: "/students/$studentId", params: { studentId: extraction.student_id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply changes.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <SiteShell>
      <div className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
        <Breadcrumbs
          trail={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Documents", to: "/documents" },
            { label: "Review IEP" },
          ]}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Review IEP draft</h1>
            <p className="text-sm text-muted-foreground">
              Section by section, accept, edit, or reject the AI's reading. Only what you accept becomes part of the student's profile.
            </p>
          </div>
          {extraction && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/students/$studentId" params={{ studentId: extraction.student_id }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to student
              </Link>
            </Button>
          )}
        </div>

        <TrustNote variant="document" />
        <AIDisclaimer />

        <DocumentClassificationCard documentId={documentId} />

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground max-w-md">
            Push this document's parsed summary into the Pathway Report as
            grounded evidence. Safe to run again — duplicates are skipped.
          </p>
          <ExtractEvidenceButton
            mode="document"
            documentId={documentId}
            label="Extract evidence into report"
          />
        </div>





        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading review…
          </div>
        ) : !extraction ? (
          <Card><CardContent className="py-6 text-sm">Extraction not available.</CardContent></Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Provide the IEP text</CardTitle>
                <CardDescription>
                  Paste the text of the IEP (or the relevant transition pages) so the AI can draft sections to review. The original document stays in your private storage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={6}
                  placeholder="Paste IEP text here…"
                />
                <div className="flex items-center gap-2">
                  <Button onClick={handleRun} disabled={running}>
                    {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {totalWithValue > 0 ? "Re-run extraction" : "Extract draft"}
                  </Button>
                  {totalWithValue > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {acceptedCount}/{totalWithValue} sections accepted
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4">
              {sections.map(({ key, data }) => (
                <SectionCard
                  key={key}
                  label={SECTION_LABELS[key].label}
                  hint={SECTION_LABELS[key].hint}
                  section={data}
                  onChange={(patch) => setSection(key, patch)}
                />
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Missing information</CardTitle>
                <CardDescription>List anything the IEP did NOT cover that the team should follow up on.</CardDescription>
              </CardHeader>
              <CardContent>
                <ListEditor
                  items={extraction.missing_information}
                  onChange={(items) => saveMeta({ missing_information: items })}
                  placeholder="e.g. No transportation plan after age 18"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Questions for the next meeting</CardTitle>
                <CardDescription>Add suggested questions to bring to the PPT / IEP meeting.</CardDescription>
              </CardHeader>
              <CardContent>
                <ListEditor
                  items={extraction.suggested_questions}
                  onChange={(items) => saveMeta({ suggested_questions: items })}
                  placeholder="e.g. How will we measure progress on the employment goal?"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reviewer notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={4}
                  value={extraction.review_notes ?? ""}
                  onChange={(e) => setExtraction({ ...extraction, review_notes: e.target.value })}
                  onBlur={() => saveMeta({ review_notes: extraction.review_notes ?? "" })}
                  placeholder="Anything else the team should know about this IEP…"
                />
              </CardContent>
            </Card>

            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
              <div className="text-sm">
                <div className="font-medium">Apply accepted sections to the student profile</div>
                <div className="text-muted-foreground">
                  Only sections marked <Badge variant="outline" className="mx-1">Accept</Badge> or <Badge variant="outline" className="mx-1">Edit</Badge> are saved. You can re-run review later.
                </div>
              </div>
              <Button onClick={handleApply} disabled={applying || acceptedCount === 0}>
                {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Save to student profile
              </Button>
            </div>
          </>
        )}
      </div>
    </SiteShell>
  );
}

function SectionCard({
  label,
  hint,
  section,
  onChange,
}: {
  label: string;
  hint: string;
  section: ExtractionSection;
  onChange: (patch: Partial<ExtractionSection>) => void;
}) {
  const [editing, setEditing] = useState(false);

  const stateBadge: Record<SectionReviewState, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    pending: { label: "Pending", variant: "secondary" },
    accepted: { label: "Accepted", variant: "default" },
    edited: { label: "Edited", variant: "default" },
    rejected: { label: "Rejected", variant: "destructive" },
    uncertain: { label: "Uncertain", variant: "outline" },
  };

  const empty = !(section.original_value || "").trim();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm">{label}</CardTitle>
            <CardDescription className="text-xs">{hint}</CardDescription>
          </div>
          <Badge variant={stateBadge[section.state].variant}>{stateBadge[section.state].label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {empty ? (
          <div className="text-sm italic text-muted-foreground">
            The AI did not find this in the document.
          </div>
        ) : editing || section.state === "edited" ? (
          <Textarea
            rows={4}
            value={section.value}
            onChange={(e) => onChange({ value: e.target.value, state: "edited" })}
          />
        ) : (
          <div className="whitespace-pre-wrap rounded border bg-muted/30 p-3 text-sm">
            {section.value}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={section.state === "accepted" ? "default" : "outline"}
            onClick={() => { setEditing(false); onChange({ state: "accepted", value: section.original_value }); }}
            disabled={empty}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" /> Accept
          </Button>
          <Button
            size="sm"
            variant={section.state === "edited" ? "default" : "outline"}
            onClick={() => { setEditing(true); onChange({ state: "edited" }); }}
            disabled={empty}
          >
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>
          <Button
            size="sm"
            variant={section.state === "rejected" ? "destructive" : "outline"}
            onClick={() => { setEditing(false); onChange({ state: "rejected" }); }}
          >
            <XCircle className="mr-1 h-4 w-4" /> Reject
          </Button>
          <Button
            size="sm"
            variant={section.state === "uncertain" ? "secondary" : "outline"}
            onClick={() => onChange({ state: "uncertain" })}
          >
            <HelpCircle className="mr-1 h-4 w-4" /> Uncertain
          </Button>
          {section.state !== "pending" && (
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); onChange({ state: "pending", value: section.original_value, notes: "" }); }}>
              <Circle className="mr-1 h-4 w-4" /> Reset
            </Button>
          )}
        </div>

        <Input
          value={section.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Reviewer note (optional)"
          className="text-xs"
        />
      </CardContent>
    </Card>
  );
}

function ListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-2">
      {items.length === 0 && <div className="text-xs text-muted-foreground">None yet.</div>}
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center justify-between gap-2 rounded border bg-muted/20 px-2 py-1 text-sm">
            <span className="flex-1">{it}</span>
            <Button size="sm" variant="ghost" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Label htmlFor="list-add" className="sr-only">Add item</Label>
        <Input
          id="list-add"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onChange([...items, draft.trim()]);
              setDraft("");
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (!draft.trim()) return;
            onChange([...items, draft.trim()]);
            setDraft("");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
