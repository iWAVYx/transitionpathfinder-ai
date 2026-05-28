import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles, Info } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { ReportView } from "@/components/pathway/ReportView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_REPORT, DEMO_STUDENT } from "@/lib/demo-data";

export const Route = createFileRoute("/demo_/report")({
  head: () => ({
    meta: [
      { title: "Sample Pathway Report — TransitionForward demo" },
      {
        name: "description",
        content:
          "A complete sample Pathway Report for a fictional Connecticut high school student in transition planning.",
      },
    ],
  }),
  component: DemoReportPage,
});

function DemoReportPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 lg:px-8">
        <Link
          to="/demo"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to demo overview
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> Demo · step 2 of 3
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Fictional student
          </Badge>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-sm leading-relaxed text-foreground/85">
            This is a complete sample Pathway Report — exactly the format families and educators
            receive. Switch between <strong>Family view</strong> and <strong>Educator view</strong>{" "}
            using the tabs in the toolbar. Try <strong>Download</strong> to see the print-ready
            PDF. Interactive AI features are disabled in demo mode.
          </div>
        </div>
      </section>

      <ReportView name={DEMO_STUDENT.first_name} report={DEMO_REPORT} demo />

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/60 bg-gradient-hero p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Next
            </p>
            <p className="mt-1 font-display text-xl">
              See how this becomes Maya's ongoing Student Hub.
            </p>
          </div>
          <Button asChild>
            <Link to="/demo/hub">
              Open the Student Hub <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
