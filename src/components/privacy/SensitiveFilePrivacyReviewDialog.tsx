import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  prepareSensitiveFileReview,
  type SensitiveFileReviewSource,
} from "@/lib/sensitive-file-review.browser";
import {
  createPrivacySafeTextFile,
  type SensitiveDataCategory,
  type SensitiveTextContext,
  type SensitiveTextRedactionReport,
} from "@/lib/sensitive-text-redaction";

const CATEGORY_LABELS: Record<SensitiveDataCategory, string> = {
  address: "address",
  date_of_birth: "birth date",
  email: "email",
  government_id: "government or benefit ID",
  phone: "phone number",
  school: "school name",
  student_id: "student ID",
  student_name: "student name",
};

type Props = {
  source: SensitiveFileReviewSource | null;
  context?: SensitiveTextContext;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (result: {
    file: File;
    text: string;
    report: SensitiveTextRedactionReport;
  }) => void | Promise<void>;
};

export function SensitiveFilePrivacyReviewDialog({
  source,
  context,
  confirmLabel = "Use privacy-safe copy",
  onCancel,
  onConfirm,
}: Props) {
  const [reviewText, setReviewText] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [report, setReport] = useState<SensitiveTextRedactionReport>({ total: 0, counts: {} });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReviewText("");
    setSourceLabel("");
    setReport({ total: 0, counts: {} });
    setError(null);
    setConfirmedReview(false);

    if (!source) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void prepareSensitiveFileReview(source, context)
      .then((prepared) => {
        if (cancelled) return;
        setReviewText(prepared.redactedText);
        setSourceLabel(prepared.sourceLabel);
        setReport(prepared.report);
      })
      .catch((reason) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "The document could not be reviewed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [context, source]);

  const categorySummary = Object.entries(report.counts)
    .filter((entry): entry is [SensitiveDataCategory, number] => Boolean(entry[1]))
    .map(([category, count]) => `${count} ${CATEGORY_LABELS[category]}`)
    .join(", ");

  async function confirm() {
    if (!confirmedReview || !reviewText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({
        file: createPrivacySafeTextFile(reviewText),
        text: reviewText,
        report,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={source !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Review private details before saving
          </DialogTitle>
          <DialogDescription>
            TransitionForward reads this locally first and creates a new text-only copy. The
            original file, its hidden content, and its metadata are not included in that copy.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Preparing a private review…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="flex items-start gap-2 font-semibold">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> The original was blocked
            </p>
            <p className="mt-2">{error}</p>
            <p className="mt-2">
              Nothing from this file has been uploaded, saved, or sent for analysis.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Source reviewed locally: {sourceLabel}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {report.total > 0
                  ? `Suggested redactions applied: ${categorySummary}.`
                  : "No common identifiers were found automatically."}{" "}
                Automatic detection can miss private information, so you must read and edit the copy
                below.
              </p>
            </div>

            <div>
              <label htmlFor="privacy-review-text" className="text-sm font-medium">
                Privacy-safe text copy
              </label>
              <Textarea
                id="privacy-review-text"
                rows={14}
                className="mt-2 font-mono text-xs leading-relaxed"
                value={reviewText}
                onChange={(event) => {
                  setReviewText(event.target.value);
                  setConfirmedReview(false);
                }}
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Remove anything else that could identify the student or family. Keep only the
                educational information needed for this task. Dates that are not labeled as a birth
                date are intentionally preserved because service and IEP dates may matter.
              </p>
            </div>

            <label className="flex items-start gap-2.5 rounded-xl border p-3 text-sm leading-relaxed">
              <Checkbox
                checked={confirmedReview}
                onCheckedChange={(value) => setConfirmedReview(value === true)}
                className="mt-0.5"
                aria-label="Confirm privacy review"
              />
              <span>
                I reviewed this copy and removed any remaining personal details I do not want saved
                or analyzed. I understand automatic suggestions are not a guarantee of complete
                de-identification.
              </span>
            </label>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          {!error && !loading && (
            <Button
              type="button"
              onClick={() => void confirm()}
              disabled={!confirmedReview || !reviewText.trim() || submitting}
            >
              {submitting ? "Preparing…" : confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
