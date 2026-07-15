import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  extractEvidenceFromDocument,
  extractEvidenceFromText,
} from "@/lib/report-evidence/extract.functions";

type SourceKind =
  | "document"
  | "note"
  | "goal"
  | "meeting"
  | "voice_response"
  | "assessment"
  | "opportunity"
  | "other";

type Props =
  | {
      /** Extract from a stored document's parsed summary. */
      mode: "document";
      documentId: string;
      label?: string;
      variant?: ButtonProps["variant"];
      size?: ButtonProps["size"];
      onDone?: (result: { extracted: number; inserted: number }) => void;
    }
  | {
      /** Extract from arbitrary text (intake answers, meeting notes, etc.). */
      mode: "text";
      studentId: string;
      sourceKind: Exclude<SourceKind, "document">;
      sourceId?: string | null;
      sourceLabel: string;
      /** Called lazily so we always send the latest form state. */
      getText: () => string;
      contextHint?: string;
      label?: string;
      variant?: ButtonProps["variant"];
      size?: ButtonProps["size"];
      onDone?: (result: { extracted: number; inserted: number }) => void;
    };

/**
 * Small button used on feature pages (Documents, Intake, Meetings) to push
 * source content through the AI evidence extractor. Never rendered on any
 * dashboard — feature-page surfaces only. See Slice D of the AI evidence
 * roadmap.
 */
export function ExtractEvidenceButton(props: Props) {
  const [busy, setBusy] = useState(false);
  const runDoc = useServerFn(extractEvidenceFromDocument);
  const runText = useServerFn(extractEvidenceFromText);

  async function handleClick() {
    setBusy(true);
    try {
      let res: { extracted: number; inserted: number };
      if (props.mode === "document") {
        res = await runDoc({ data: { document_id: props.documentId } });
      } else {
        const text = (props.getText() || "").trim();
        if (text.length < 40) {
          toast.error("Add at least a paragraph before extracting evidence.");
          setBusy(false);
          return;
        }
        res = await runText({
          data: {
            student_id: props.studentId,
            source_kind: props.sourceKind,
            source_id: props.sourceId ?? null,
            source_label: props.sourceLabel,
            text,
            context_hint: props.contextHint,
          },
        });
      }
      if (res.inserted > 0) {
        toast.success(
          `Linked ${res.inserted} new evidence item${res.inserted === 1 ? "" : "s"} to the Pathway Report.`,
        );
      } else if (res.extracted > 0) {
        toast.info("Nothing new — this content is already linked as evidence.");
      } else {
        toast.info("No usable evidence found in this content yet.");
      }
      props.onDone?.(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't extract evidence.");
    } finally {
      setBusy(false);
    }
  }

  const label = props.label ?? "Extract evidence";

  return (
    <Button
      type="button"
      variant={props.variant ?? "outline"}
      size={props.size ?? "sm"}
      onClick={handleClick}
      disabled={busy}
      aria-label={label}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {busy ? "Extracting…" : label}
    </Button>
  );
}
