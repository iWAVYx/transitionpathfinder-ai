import { DocumentWatermark } from "@/components/documents/DocumentWatermark";
import type { ReactNode } from "react";
import type { PptAgenda } from "@/lib/ppt.functions";
import { DocumentViewStyles } from "./DocumentViewStyles";
import { DocumentPrintStyles } from "./DocumentPrintStyles";
import { DocumentPrintHeader } from "./DocumentPrintHeader";
import { AIDisclaimer } from "@/components/site/AIDisclaimer";
import { Button } from "@/components/ui/button";
import { toTitleCase } from "@/lib/title-case";

export function PptAgendaDocument({
  name,
  agenda,
  studentId,
  meetingDate,
  partnerContent,
  onAddAction,
  onReset,
}: {
  name: string;
  agenda: PptAgenda;
  studentId: string | null;
  meetingDate: string | null;
  partnerContent?: ReactNode;
  onAddAction?: (title: string) => Promise<void>;
  onReset: () => void;
}) {
  return (
    <section data-generated-document data-print-document data-ppt-print-packet className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <DocumentWatermark />
      <DocumentViewStyles />
      <DocumentPrintStyles />
      <DocumentPrintHeader title="PPT Meeting Prep" />
      <div className="rounded-3xl bg-gradient-hero p-5 shadow-soft sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">PPT Meeting Prep</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          A Meeting Plan For {toTitleCase(name)}.
        </h1>
        <p className="mt-4 text-base italic leading-relaxed text-foreground/80">{agenda.opening_note}</p>
      </div>

      <div className="mt-6">
        <AIDisclaimer />
      </div>


      <Block title="Suggested agenda">
        <ol className="space-y-3">
          {agenda.agenda.map((item, i) => (
            <li key={i} className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-4">
              <span className="mt-0.5 inline-flex h-8 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {item.minutes} min
              </span>
              <div>
                <p className="font-display text-base font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.purpose}</p>
              </div>
            </li>
          ))}
        </ol>
      </Block>

      <div className={!studentId && !meetingDate ? "print:hidden" : undefined}>
      <Block title="Partner contacts & deadlines">
        {partnerContent}
      </Block>
      </div>

      <Block title="Questions to ask">
        <BulletList items={agenda.questions_to_ask} onAddAction={studentId ? onAddAction : undefined} />
      </Block>

      <Block title="What to bring as evidence">
        <BulletList items={agenda.evidence_to_bring} onAddAction={studentId ? onAddAction : undefined} />
      </Block>

      <Block title="Language that works">
        <ul className="mt-2 space-y-3">
          {agenda.language_that_works.map((s, i) => (
            <li key={i} className="rounded-2xl border border-border/60 bg-card p-4 text-sm italic text-foreground/90">
              "{s}"
            </li>
          ))}
        </ul>
      </Block>

      <div data-document-callout className="mt-10 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">If things get stuck</p>
        <p className="mt-3 font-display text-lg italic text-foreground/90">{agenda.if_things_get_stuck}</p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3 print:hidden">
        <Button onClick={onReset} variant="outline">Prep another meeting</Button>
        <Button onClick={() => window.print()}>Print / save as PDF</Button>
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="font-display text-2xl font-medium tracking-tight">{toTitleCase(title)}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function BulletList({ items, onAddAction }: { items: string[]; onAddAction?: (title: string) => Promise<void> }) {
  return (
    <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
      {items.map((item, i) => (
        <li key={i} className="flex items-start justify-between gap-3">
          <div className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </div>
          {onAddAction && (
            <button type="button" onClick={() => void onAddAction(item)} className="print:hidden shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted">+ Action</button>
          )}
        </li>
      ))}
    </ul>
  );
}
