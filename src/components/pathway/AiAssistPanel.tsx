import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Languages, Sparkles, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  translateReport,
  suggestNextSteps,
  SUPPORTED_LANGUAGES,
  type NextSteps,
  type SupportedLanguage,
} from "@/lib/ai-assist.functions";
import type { PathwayReport } from "@/lib/pathway.functions";

export function AiAssistPanel({
  studentName,
  report,
  onTranslated,
  onReset,
  translatedTo,
}: {
  studentName: string;
  report: PathwayReport;
  onTranslated: (next: PathwayReport, lang: SupportedLanguage) => void;
  onReset: () => void;
  translatedTo: SupportedLanguage | null;
}) {
  const translate = useServerFn(translateReport);
  const suggest = useServerFn(suggestNextSteps);

  const [lang, setLang] = useState<SupportedLanguage>("spanish");
  const [translating, setTranslating] = useState(false);
  const [steps, setSteps] = useState<NextSteps | null>(null);
  const [loadingSteps, setLoadingSteps] = useState(false);

  async function handleTranslate() {
    setTranslating(true);
    try {
      const r = await translate({ data: { report, language: lang } });
      onTranslated(r.report, r.language);
      toast.success("Translated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Translation failed.");
    } finally {
      setTranslating(false);
    }
  }

  async function handleSuggest() {
    setLoadingSteps(true);
    try {
      const r = await suggest({
        data: { student_first_name: studentName, report },
      });
      setSteps(r.next_steps);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't generate next steps.");
    } finally {
      setLoadingSteps(false);
    }
  }

  return (
    <div className="no-print mt-8 rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg">Pathway Assist</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Translate this Pathway Report for the family or get small, concrete next steps for the coming week.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Translate */}
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Languages className="h-4 w-4 text-primary" />
            Translate
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {translatedTo
              ? `Currently showing: ${SUPPORTED_LANGUAGES.find((l) => l.value === translatedTo)?.label}`
              : "Currently showing: English"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as SupportedLanguage)}
              className="rounded-lg border bg-background px-3 py-1.5 text-sm"
              disabled={translating}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={handleTranslate} disabled={translating}>
              {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
              {translating ? "Translating…" : "Translate"}
            </Button>
            {translatedTo && (
              <Button size="sm" variant="outline" onClick={onReset} disabled={translating}>
                <Undo2 className="h-4 w-4" /> Back to English
              </Button>
            )}
          </div>
        </div>

        {/* Next steps */}
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Suggest next steps
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Small, concrete actions tailored to this report.
          </p>
          <div className="mt-3">
            <Button size="sm" onClick={handleSuggest} disabled={loadingSteps}>
              {loadingSteps ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loadingSteps ? "Thinking…" : steps ? "Refresh suggestions" : "Suggest next steps"}
            </Button>
          </div>
          {steps && (
            <div className="mt-4 space-y-3 text-sm">
              <NextBlock title="This week" items={steps.this_week} />
              <NextBlock title="This month" items={steps.this_month} />
              <NextBlock title="Conversation starters" items={steps.conversation_starters} />
              <NextBlock title="Gently watch for" items={steps.watch_for} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NextBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{title}</p>
      <ul className="mt-1 space-y-1 text-muted-foreground">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
