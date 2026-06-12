import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Quote } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { photos, srcSetFor } from "@/lib/photos";

const aboutHero = photos.about;
const aboutHeroSrcSet = srcSetFor("about");

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — A Letter From The Founder | TransitionForward" },
      {
        name: "description",
        content:
          "A personal letter from the founder of TransitionForward — why a Connecticut special educator built a transition-planning platform for students, families, schools, and partners.",
      },
      { property: "og:title", content: "About — A Letter From The Founder" },
      {
        property: "og:description",
        content:
          "Why I left strategy to teach, and why I built TransitionForward to turn IEP transition paperwork into a clear, personalized pathway.",
      },
      { property: "og:url", content: "/about" },
      { property: "og:image", content: aboutHero },
      { name: "twitter:image", content: aboutHero },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "/about" },
    ],
  }),
  component: AboutPage,
});

// Tasteful fade-up on scroll. No parallax, no cursor effects, no sticky tricks.
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] as const } },
};

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

function AboutPage() {
  return (
    <SiteShell>
      {/* ───────────── Opening: a letter, not a hero ───────────── */}
      <section className="border-b border-border/60 bg-background">
        <div className="mx-auto max-w-3xl px-6 pt-20 pb-14 sm:pt-28 sm:pb-20">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              A Letter From The Founder
            </p>
            <h1 className="mt-5 font-serif text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              I built TransitionForward because the system kept failing the students I love.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              What follows is the honest version — why I left a career in strategy
              to teach, what I saw in the classroom, and what we are building so
              no family has to navigate this alone.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ───────────── The Letter ───────────── */}
      <section className="bg-background">
        <article className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
          <div className="space-y-7 font-serif text-lg leading-[1.85] text-foreground/90 sm:text-[1.2rem]">
            <Reveal>
              <p>Dear reader,</p>
            </Reveal>

            <Reveal delay={0.05}>
              <p>
                Before I was a special educator, I sat in conference rooms with
                spreadsheets, building strategy decks for organizations whose
                outcomes I would never see. The work was clean. The stakes were
                abstract. And one day it stopped being enough.
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <p>
                I went back to school for a Master of Arts in Teaching and walked
                into a Connecticut classroom — high-school students with IEPs,
                most of them within a few years of aging out of the only support
                system they had ever known. I expected to teach. I did not expect
                to spend half of my evenings translating binders, chasing signed
                forms, and explaining the difference between an IEP transition
                plan and an actual plan for life after eighteen.
              </p>
            </Reveal>

            <Reveal delay={0.05}>
              <figure className="my-12 border-l-2 border-primary/60 pl-6">
                <Quote className="h-5 w-5 text-primary/70" aria-hidden />
                <blockquote className="mt-3 font-serif text-2xl leading-snug text-foreground sm:text-3xl">
                  Families were not failing. The handoff was failing them.
                </blockquote>
              </figure>
            </Reveal>

            <Reveal delay={0.05}>
              <p>
                I watched families I respected — parents who worked two jobs,
                guardians who had advocated for a decade — leave PPT meetings
                clutching a stack of paper and a vague sense that something
                important had just been decided in language they were never
                fully given. I watched seniors graduate without a clear next
                step, not because the adults around them did not care, but
                because nothing connected: the IEP, the agencies, the colleges,
                the employers, the family at the kitchen table.
              </p>
            </Reveal>

            <Reveal delay={0.05}>
              <p>
                I started building tools for my own caseload. Then for my
                colleagues. Then, on weekends, for any educator who would talk
                to me about what was missing. TransitionForward grew out of
                those conversations. It is opinionated because the work demands
                opinions. It is gentle with families because the system rarely is.
              </p>
            </Reveal>

            <Reveal delay={0.05}>
              <p>
                My promise is small and specific: we will move transition
                planning from paperwork to a pathway — one a student can read,
                a family can understand, an educator can stand behind, and a
                district can trust.
              </p>
            </Reveal>

            <Reveal delay={0.05}>
              <p className="pt-2">
                Thank you for reading this far.
              </p>
            </Reveal>

            <Reveal delay={0.05}>
              <div className="pt-2">
                <p className="font-serif text-xl italic text-foreground">— The Founder</p>
                <p className="mt-1 text-sm not-italic text-muted-foreground">
                  Special Educator · Connecticut · Founder, TransitionForward
                </p>
              </div>
            </Reveal>
          </div>
        </article>
      </section>

      {/* ───────────── The Problem, Plainly Stated ───────────── */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              The Problem
            </p>
            <h2 className="mt-4 font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
              Transition Planning Is Required By Law. It Is Almost Never Coordinated.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              The IEP transition plan is a single page in a binder. The actual
              transition — to college, work, independent living, adult services —
              happens across a dozen systems that were never designed to talk to
              one another.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Reveal delay={0.05}>
              <div className="h-full rounded-2xl border border-border/60 bg-background p-7">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  What Families Get Today
                </p>
                <ul className="mt-5 space-y-3 text-[0.98rem] leading-relaxed text-foreground/85">
                  <li>A binder of forms, most written for compliance auditors.</li>
                  <li>A list of agency phone numbers, most with waitlists.</li>
                  <li>An annual meeting that ends with signatures, not next steps.</li>
                  <li>The quiet assumption that someone, somewhere, is coordinating.</li>
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="h-full rounded-2xl border border-primary/30 bg-primary/[0.04] p-7">
                <p className="text-xs uppercase tracking-[0.16em] text-primary">
                  What TransitionForward Builds
                </p>
                <ul className="mt-5 space-y-3 text-[0.98rem] leading-relaxed text-foreground/90">
                  <li>One pathway, written in plain language the student can read.</li>
                  <li>Action items tied to real deadlines, with the right adult assigned.</li>
                  <li>A shared view for student, family, educator, and partners.</li>
                  <li>An audit trail districts can stand behind without extra work.</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────────── Quiet close ───────────── */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
          <Reveal>
            <h2 className="font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
              If Any Of This Sounds Familiar, You Are Not Alone.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              TransitionForward is built for the families, educators, and
              districts who are already doing the work — and deserve a tool that
              respects it.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/waitlist">
                  Join The Waitlist <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="rounded-full">
                <Link to="/contact">Get In Touch</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
