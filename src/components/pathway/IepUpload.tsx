import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractFromIep, type IepExtract } from "@/lib/iep-extract.functions";
import iepImage from "@/assets/bundled/iep-upload-buried.webp";
import { TrustNote } from "@/components/site/TrustNote";
import {
  SensitiveFilePrivacyReviewDialog,
} from "@/components/privacy/SensitiveFilePrivacyReviewDialog";
import type { SensitiveFileReviewSource } from "@/lib/sensitive-file-review.browser";
import {
  PROTECTED_FILE_UPLOADS_ENABLED,
  PROTECTED_FILE_UPLOADS_MESSAGE,
} from "@/lib/protected-file-uploads";

type Props = {
  onExtracted: (extract: IepExtract) => void;
};

export function IepUpload({ onExtracted }: Props) {
  const extract = useServerFn(extractFromIep);
  const [busy, setBusy] = useState<null | "reading" | "thinking">(null);
  const [pasted, setPasted] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [privacySource, setPrivacySource] = useState<SensitiveFileReviewSource | null>(null);

  async function handleText(text: string) {
    if (text.trim().length < 40) {
      toast.error("That's not quite enough text to read from.");
      return;
    }
    setBusy("thinking");
    try {
      const res = await extract({ data: { text } });
      onExtracted(res.extract);
      toast.success("We filled in what we could find. Please review every field before generating.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that document.");
    } finally {
      setBusy(null);
    }
  }

  const loading = busy !== null;

  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft">
      <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
        <div className="p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Optional shortcut</p>
          <h3 className="mt-2 font-display text-2xl font-medium tracking-tight">
            Have an IEP Already? Let Us Read It.
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {PROTECTED_FILE_UPLOADS_ENABLED
              ? "Upload a PDF or paste the text. We'll quietly fill in the sections below — you stay in charge and can edit anything. Your file stays in your browser; only the text is sent for analysis."
              : "File selection is temporarily paused while private security scanning is finalized. You can still paste relevant IEP text below; TransitionForward will suggest redactions and require your review before analysis."}
          </p>

          {!PROTECTED_FILE_UPLOADS_ENABLED && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/60 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
            >
              <strong>IEP file selection is temporarily unavailable.</strong> Pasting text remains
              available and receives a privacy review before analysis.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label
              aria-disabled={!PROTECTED_FILE_UPLOADS_ENABLED}
              title={!PROTECTED_FILE_UPLOADS_ENABLED ? PROTECTED_FILE_UPLOADS_MESSAGE : undefined}
              className={`inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all ${
                PROTECTED_FILE_UPLOADS_ENABLED
                  ? "cursor-pointer hover:shadow-lift"
                  : "cursor-not-allowed opacity-50"
              }`}
            >
              <input
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                className="hidden"
                disabled={loading || !PROTECTED_FILE_UPLOADS_ENABLED}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPrivacySource({ kind: "file", file: f });
                  e.target.value = "";
                }}
              />
              {busy === "reading"
                ? "Reading PDF…"
                : busy === "thinking"
                  ? "Understanding…"
                  : PROTECTED_FILE_UPLOADS_ENABLED
                    ? "Upload IEP (PDF)"
                    : "IEP file upload paused"}
            </label>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={loading}
              onClick={() => setShowPaste((v) => !v)}
            >
              {showPaste ? "Hide paste box" : "Or paste IEP text"}
            </Button>
          </div>

          {showPaste && (
            <div className="mt-4 space-y-2">
              <Textarea
                rows={6}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="Paste the relevant pages of the IEP here…"
                disabled={loading}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  disabled={loading || pasted.trim().length < 40}
                  onClick={() =>
                    setPrivacySource({ kind: "text", name: "Pasted IEP text", text: pasted })
                  }
                >
                  {busy === "thinking" ? "Understanding…" : "Read this text"}
                </Button>
              </div>
            </div>
          )}

          <TrustNote variant="document" className="mt-4" />
          <p className="mt-3 text-xs italic text-muted-foreground">
            Privacy: automatic suggestions help remove common identifiers, and you approve the
            text-only copy before analysis. The original file is not stored.
          </p>
        </div>

        <div className="relative hidden min-h-[220px] bg-gradient-warm md:block">
          <img
            src={iepImage}
            alt=""
            aria-hidden
            loading="lazy"
            width={1024}
            height={640}
            className="absolute inset-0 h-full w-full object-cover mix-blend-multiply opacity-90"
          />
        </div>
      </div>
      <SensitiveFilePrivacyReviewDialog
        source={privacySource}
        confirmLabel="Analyze privacy-safe text"
        onCancel={() => setPrivacySource(null)}
        onConfirm={({ text }) => {
          setPrivacySource(null);
          void handleText(text);
        }}
      />
    </div>
  );
}
