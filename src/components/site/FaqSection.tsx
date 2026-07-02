import { HelpCircle } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  title?: string;
  items: FaqItem[];
}

export function FaqSection({
  title = "Frequently Asked Questions",
  items,
}: FaqSectionProps) {
  return (
    <section className="relative mt-10 overflow-hidden rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <HelpCircle className="h-4 w-4" /> FAQ
        </div>
        <h2 className="mt-2 font-display text-2xl font-medium tracking-tight">
          {title}
        </h2>
        <dl className="mt-5 space-y-4">
          {items.map(({ question, answer }) => (
            <div key={question} className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <dt className="font-medium text-foreground">{question}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
