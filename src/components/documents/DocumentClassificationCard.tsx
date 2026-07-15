import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Tag } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DOC_TYPES,
  classifyDocument,
  getDocumentMeta,
  markDocumentReviewed,
  type DocType,
  type DocumentMetaRow,
} from "@/lib/documents.functions";

const DOC_TYPE_LABELS: Record<DocType, string> = {
  "iep": "IEP",
  "current-iep": "Current IEP",
  "previous-iep": "Previous IEP",
  "evaluation": "Evaluation",
  "transition-plan": "Transition Plan",
  "progress-report": "Progress Report",
  "meeting-notes": "Meeting Notes",
  "other": "Other",
};

export function DocumentClassificationCard({
  documentId,
  className,
}: {
  documentId: string;
  className?: string;
}) {
  const fnGet = useServerFn(getDocumentMeta);
  const fnClassify = useServerFn(classifyDocument);
  const fnReview = useServerFn(markDocumentReviewed);

  const [meta, setMeta] = useState<DocumentMetaRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fnGet({ data: { document_id: documentId } })
      .then((r) => setMeta(r))
      .catch(() => setMeta(null));
  }, [documentId, fnGet]);

  async function handleTypeChange(value: string) {
    if (!meta || value === meta.doc_type) return;
    setSaving(true);
    try {
      const row = await fnClassify({ data: { id: documentId, doc_type: value as DocType } });
      setMeta(row);
      toast.success("Document type updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update document type.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleReviewed() {
    if (!meta) return;
    setSaving(true);
    try {
      const row = await fnReview({ data: { id: documentId, reviewed: !meta.reviewed_at } });
      setMeta(row);
      toast.success(row.reviewed_at ? "Marked as reviewed." : "Review cleared.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update review status.");
    } finally {
      setSaving(false);
    }
  }

  if (!meta) return null;

  const reviewed = !!meta.reviewed_at;
  const usedInReport = !!meta.used_in_report_at;

  return (
    <Card className={className} data-testid="document-classification-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tag className="h-4 w-4" /> Classification & Review
        </CardTitle>
        <CardDescription>
          Categorize this document and mark it reviewed once you have looked it over. Reviewed
          documents can inform the student's Pathway Report.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="doc-type-select" className="text-xs uppercase tracking-wider text-muted-foreground">
            Document Type
          </Label>
          <select
            id="doc-type-select"
            data-testid="doc-type-select"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={meta.doc_type}
            disabled={saving}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOC_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {reviewed ? (
            <Badge variant="secondary" className="gap-1" data-testid="reviewed-badge">
              <CheckCircle2 className="h-3 w-3" />
              Reviewed {new Date(meta.reviewed_at as string).toLocaleDateString()}
            </Badge>
          ) : (
            <Badge variant="outline" data-testid="unreviewed-badge">Not yet reviewed</Badge>
          )}
          {usedInReport && (
            <Badge variant="secondary" data-testid="used-in-report-badge">
              Used in Pathway Report
            </Badge>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant={reviewed ? "outline" : "default"}
          onClick={handleToggleReviewed}
          disabled={saving}
          data-testid="toggle-reviewed-btn"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : reviewed ? (
            "Clear reviewed"
          ) : (
            "Mark reviewed"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
