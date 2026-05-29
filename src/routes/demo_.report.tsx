import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles, Info, FileText, Download, Eye } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

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
      {/* Cinematic hero intro */}
      <section
        ref={heroRef}
        className="relative isolate overflow-hidden"
      >
        {/* Ambient gradient orbs */}
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
          className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:px-6 lg:px-8"
        >
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              to="/demo"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to demo overview
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-5 flex flex-wrap items-center gap-2"
          >
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> Demo · step 2 of 3
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> Fictional student
            </Badge>
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <FileText className="h-3 w-3" /> Report TF-DEMO-2026-0001
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
            scroll on to read it like Maya's family would.
          </motion.p>

          {/* Floating quick-action chips */}
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
            ].map((chip, i) => (
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

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Scroll to read
          </motion.div>
        </motion.div>
      </section>

      <ReportView
        name={DEMO_STUDENT.first_name}
        report={DEMO_REPORT}
        demo
        meta={{
          reportId: "TF-DEMO-2026-0001",
          preparedFor: `${DEMO_STUDENT.full_name} · ${DEMO_STUDENT.grade} · ${DEMO_STUDENT.school}`,
          preparedBy: "TransitionForward (AI-supported) · Reviewed by Ms. Alvarez, Case Manager",
          issued: "March 4, 2026",
          version: "1.0",
          confidentiality: "Confidential — for Maya, the Rivera family, and authorized EHHS team members",
        }}
      />

      {/* Cinematic outro */}
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-hero p-8 shadow-lift"
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Next
              </p>
              <p className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">
                See how this becomes Maya's ongoing Student Hub.
              </p>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                The report doesn't end on the page — it becomes a living workspace the whole team can build on together.
              </p>
            </div>
            <Button asChild size="lg" className="group gap-2">
              <Link to="/demo/hub">
                Open the Student Hub
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </SiteShell>
  );
}
