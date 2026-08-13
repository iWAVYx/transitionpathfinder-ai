import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractFromIep, type IepExtract } from "@/lib/iep-extract.functions";
import iepImage from "@/assets/bundled/iep-upload-buried.webp";
import { TrustNote } from "@/components/site/TrustNote";

type Props = {
  onExtracted: (extract: IepExtract) => void;
};

async function extractPdfText(file: File): Promise<string> {
  // Use legacy build so it works inside the browser bundler
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Worker via CDN to avoid bundling complexity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjs as any).GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.mjs`;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  const max = Math.min(doc.numPages, 40);
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
    out += text + "\n\n";
  }
  return out;
}

export function IepUpload({ onExtracted }: Props) {
  const extract = useServerFn(extractFromIep);
  const [busy, setBusy] = useState<null | "reading" | "thinking">(null);
  const [pasted, setPasted] = useState("");
  const [showPaste, setShowPaste] = useState(false);

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

  async function handleFile(file: File) {
    setBusy("reading");
    try {
      let text = "";
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        text = await extractPdfText(file);
      } else {
        text = await file.text();
      }
      if (!text.trim()) {
        toast.error("We couldn't read text from that file. Try pasting it instead.");
        setBusy(null);
        return;
      }
      await handleText(text);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't read that file. Try pasting the text instead.");
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
            Upload a PDF or paste the text. We'll quietly fill in the sections below — you stay in
            charge and can edit anything. Your file stays in your browser; only the text is sent for
            analysis.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift disabled:opacity-50">
              <input
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                className="hidden"
                disabled={loading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              {busy === "reading" ? "Reading PDF…" : busy === "thinking" ? "Understanding…" : "Upload IEP (PDF)"}
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
                  onClick={() => handleText(pasted)}
                >
                  {busy === "thinking" ? "Understanding…" : "Read this text"}
                </Button>
              </div>
            </div>
          )}

          <TrustNote variant="document" className="mt-4" />
          <p className="mt-3 text-xs italic text-muted-foreground">
            Privacy: please remove last names or other identifying details before uploading. We do not
            store the file — only the structured fields you choose to save.
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
    </div>
  );
}
