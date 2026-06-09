import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Info, FileText, Download, Eye } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { ReportView } from "@/components/pathway/ReportView";
import { Badge } from "@/components/ui/badge";
import { getDemoStudent } from "@/lib/demo-data";
import { EXTENDED_PLANS } from "@/lib/demo-extended-plans";

export const Route = createFileRoute("/demo_/report")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Sample Pathway Report — TransitionForward demo" },
      {
        name: "description",
        content:
          "A complete sample Pathway Report for a fictional Connecticut high school student in transition planning.",
      },
      { property: "og:url", content: "/demo/report" },
    ],
    links: [{ rel: "canonical", href: "/demo/report" }],
  }),
  component: DemoReportPage,
});

function DemoReportPage() {
  const { s } = Route.useSearch();
  const bundle = getDemoStudent(s);
  const { profile: student, report, reportId, issued } = bundle;

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);

  return (
    <SiteShell>
      <DemoStepBar current="report" student={s} />

      {/* Cinematic hero intro */}
      <section ref={heroRef} className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <motion.div
            aria-hidden
            className="absolute -top-32 left-1/4 h-[480px] w-[480px] rounded-full bg-primary/15 blur-3xl"
            animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute -bottom-40 right-0 h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, -30, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="mx-auto max-w-[92rem] px-4 pb-10 pt-8 sm:px-6 lg:px-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="flex flex-wrap items-center gap-2"
          >
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> Step 3 · Pathway Report
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> Fictional student
            </Badge>
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <FileText className="h-3 w-3" /> Report {reportId}
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
          >
            A pathway, made{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                visible.
              </span>
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-gradient-to-r from-primary/60 to-accent/60"
              />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground"
          >
            This is the complete sample Pathway Report — the same format families and educators
            receive. Switch audiences with the toolbar tabs, download the print-ready PDF, or
            scroll on to read it like {student.first_name}'s family would.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap gap-2"
          >
            {[
              { icon: Eye, label: "Family view" },
              { icon: Eye, label: "Educator view" },
              { icon: Download, label: "Print-ready PDF" },
            ].map((chip) => (
              <motion.span
                key={chip.label}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-soft backdrop-blur"
              >
                <chip.icon className="h-3.5 w-3.5 text-primary" />
                {chip.label}
              </motion.span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 backdrop-blur"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-sm leading-relaxed text-foreground/85">
              Interactive AI features are disabled in demo mode. Everything you see below is the
              real report layout — only the student is fictional.
            </div>
          </motion.div>
        </motion.div>
      </section>

      <ReportView
        name={student.first_name}
        report={report}
        demo
        extendedPlans={EXTENDED_PLANS[bundle.id]}
        meta={{
          reportId,
          preparedFor: `${student.full_name} · ${student.grade} · ${student.school}`,
          preparedBy: `TransitionForward (AI-supported) · Reviewed by ${student.case_manager}, Case Manager`,
          issued,
          version: "1.0",
          confidentiality: `Confidential — for ${student.first_name}, family, and authorized ${student.school} team members`,
        }}
      />


      <section className="mx-auto max-w-[92rem] px-4 pb-6 sm:px-6 lg:px-8">
        <DemoStepFooter current="report" student={s} />
      </section>
    </SiteShell>
  );
}
