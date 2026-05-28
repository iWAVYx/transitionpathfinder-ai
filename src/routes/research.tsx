import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ExternalLink, Quote, ScrollText, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import researchHero from "@/assets/research-hero.jpg";
import {
  Parallax,
  ParallaxImage,
  Reveal,
  ShapeScroll,
  TextScrollFill,
  Marquee,
} from "@/components/effects/ScrollEffects";
import {
  CursorField,
  Magnetic,
  HoverReveal,
  TextMask,
  StickyPin,
  MorphCard,
  FloatingShape,
} from "@/components/effects/ImmersiveEffects";
import { toTitleCase } from "@/lib/title-case";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "The research behind it — TransitionForward" },
      {
        name: "description",
        content:
          "Every TransitionForward suggestion is grounded in evidence — Mazzotti, Test, Allensworth, Carter, Trainor, Burke, and Connecticut State Department of Education transition guidance.",
      },
      { property: "og:title", content: "The research behind TransitionForward" },
      {
        property: "og:description",
        content:
          "Mazzotti (2021), Test (2009), Allensworth (2013), Carter (2011, 2012), Trainor, Burke, and Connecticut SDE — plain-English summaries of every source.",
      },
    ],
  }),
  component: ResearchPage,
});

const pillars = [
  {
    n: "01",
    title: "Predictors of post-school success",
    body:
      "The updated evidence base for what actually correlates with employment, education, and independent living after high school.",
    cite: "Mazzotti et al., 2021",
  },
  {
    n: "02",
    title: "The original evidence base",
    body:
      "The foundational synthesis that named the in-school experiences linked to better post-school outcomes for students with disabilities.",
    cite: "Test et al., 2009",
  },
  {
    n: "03",
    title: "Why 9th grade matters most",
    body:
      "Freshman-year course performance is the single strongest predictor of high school graduation — earlier than anyone wants to believe.",
    cite: "Allensworth & Easton, 2013",
  },
  {
    n: "04",
    title: "Work-based learning, done right",
    body:
      "Paid, integrated work experience during high school is consistently one of the strongest in-school predictors of adult employment.",
    cite: "Carter et al., 2011, 2012",
  },
  {
    n: "05",
    title: "Family engagement as practice",
    body:
      "Transition planning that treats families as partners — not audiences — produces measurably better outcomes and plans families can actually use.",
    cite: "Trainor; Burke",
  },
  {
    n: "06",
    title: "Connecticut's transition guidance",
    body:
      "State-specific IEP guidance, secondary transition requirements, and interagency expectations from the Connecticut SDE.",
    cite: "CT State Department of Education",
  },
];

const citations = [
  {
    authors: "Mazzotti, V. L., Rowe, D. A., Kwiatek, S., Voggt, A., Chang, W., Fowler, C., Poppen, M., Sinclair, J., & Test, D. W.",
    year: "2021",
    title:
      "Secondary transition predictors of postschool success: An update to the research base.",
    journal: "Career Development and Transition for Exceptional Individuals, 44(1), 47–64.",
    note:
      "Names the in-school experiences with the strongest evidence for adult outcomes — paid work, inclusion, self-determination, parent involvement, interagency collaboration.",
  },
  {
    authors: "Test, D. W., Mazzotti, V. L., Mustian, A. L., Fowler, C. H., Kortering, L., & Kohler, P.",
    year: "2009",
    title:
      "Evidence-based secondary transition predictors for improving postschool outcomes for students with disabilities.",
    journal: "Career Development for Exceptional Individuals, 32(3), 160–181.",
    note:
      "The original synthesis that established the language of evidence-based predictors. TransitionForward's recommendation engine maps directly to these categories.",
  },
  {
    authors: "Allensworth, E. M., & Easton, J. Q.",
    year: "2013",
    title:
      "The on-track indicator as a predictor of high school graduation.",
    journal: "Consortium on Chicago School Research, University of Chicago.",
    note:
      "Why we start in 9th grade. Course performance freshman year predicts graduation better than every demographic factor combined.",
  },
  {
    authors: "Carter, E. W., Austin, D., & Trainor, A. A.",
    year: "2011",
    title:
      "Factors associated with the early work experiences of adolescents with severe disabilities.",
    journal: "Intellectual and Developmental Disabilities, 49(4), 233–247.",
    note: "Evidence on early, paid, integrated work — not unpaid simulations.",
  },
  {
    authors: "Carter, E. W., Austin, D., & Trainor, A. A.",
    year: "2012",
    title:
      "Predictors of postschool employment outcomes for young adults with severe disabilities.",
    journal: "Journal of Disability Policy Studies, 23(1), 50–63.",
    note:
      "Paid work in high school is consistently the strongest single in-school predictor of post-school employment.",
  },
  {
    authors: "Trainor, A. A.",
    year: "2008",
    title:
      "Using cultural and social capital to improve postsecondary outcomes and expand transition models for youth with disabilities.",
    journal: "The Journal of Special Education, 42(3), 148–162.",
    note:
      "Why family engagement is not a niceness — it is a transition predictor.",
  },
  {
    authors: "Burke, M. M.",
    year: "2013",
    title:
      "Improving parental involvement: Training special education advocates.",
    journal: "Journal of Disability Policy Studies, 23(4), 225–234.",
    note: "What real, sustained family engagement in IEP and transition planning looks like.",
  },
  {
    authors: "Connecticut State Department of Education",
    year: "2024",
    title:
      "Secondary transition planning guidance and IEP requirements.",
    journal: "ct.gov / Bureau of Special Education.",
    note:
      "State-specific compliance baseline — transition language, agency linkages, summary of performance.",
  },
];

const proofPoints = [
  {
    stat: "9th",
    label: "grade is when the strongest signal appears",
    sub: "Course performance freshman year predicts graduation more than any demographic factor.",
  },
  {
    stat: "20+",
    label: "evidence-based predictors mapped",
    sub: "Every TransitionForward recommendation traces back to a named, citable predictor.",
  },
  {
    stat: "1",
    label: "plain-English source per suggestion",
    sub: "No black-box AI. Every nudge has a citation a family can actually read.",
  },
];

function ResearchPage() {
  return (
    <SiteShell>
      {/* HERO with cursor-tracked blobs and text mask */}
      <CursorField className="relative border-b border-border/60">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <FloatingShape className="absolute right-[10%] top-32 -z-10 hidden h-36 w-36 lg:block">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <path
              d="M50 5 L95 50 L50 95 L5 50 Z"
              fill="hsl(40 95% 70% / 0.7)"
            />
          </svg>
        </FloatingShape>
        <FloatingShape
          className="absolute left-[8%] bottom-12 -z-10 hidden h-28 w-28 lg:block"
          delay={1.5}
          duration={11}
        >
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <circle cx="50" cy="50" r="42" fill="hsl(150 70% 65% / 0.65)" />
          </svg>
        </FloatingShape>

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-24 sm:px-6 md:grid-cols-[1.1fr_1fr] lg:px-8 lg:py-32">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              The research behind it
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl font-medium leading-[1.02] tracking-tight sm:text-7xl">
              Every suggestion has a{" "}
              <TextMask
                className="font-display"
                gradient="linear-gradient(120deg, hsl(15 90% 60%), hsl(40 95% 60%), hsl(340 85% 65%))"
              >
                source you can read.
              </TextMask>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/80 sm:text-lg">
              TransitionForward does not ask you to take its word for it. The library is seeded
              directly from Caysi's graduate capstone and the <em>Transition Forward</em> handbook
              — Mazzotti, Test, Allensworth, Carter, Trainor, Burke, and Connecticut SDE guidance.
              Plain-English summaries land below every recommendation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Magnetic>
                <Link
                  to="/framework"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
                >
                  See the framework <ArrowRight className="h-4 w-4" />
                </Link>
              </Magnetic>
              <Magnetic strength={14}>
                <a
                  href="#bibliography"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-muted"
                >
                  Jump to bibliography <ScrollText className="h-4 w-4" />
                </a>
              </Magnetic>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-warm opacity-60 blur-3xl" />
              <Parallax speed={-0.18}>
                <ParallaxImage
                  src={researchHero}
                  alt="Paper collage of open books and torn paper layers in teal, orange, and sage"
                  width={1600}
                  height={1200}
                  speed={0.5}
                  className="aspect-[4/3] w-full rounded-[2rem] shadow-lift"
                />
              </Parallax>
            </div>
          </Reveal>
        </div>
      </CursorField>

      {/* Citation marquee */}
      <section aria-label="Sources" className="border-b border-border/40 bg-muted/30 py-6">
        <Marquee
          speed={70}
          items={[
            "Mazzotti, 2021",
            "Test, 2009",
            "Allensworth, 2013",
            "Carter, 2011",
            "Carter, 2012",
            "Trainor, 2008",
            "Burke, 2013",
            "CT SDE",
          ].map((q, i) => (
            <span key={i} className="font-display text-xl text-foreground/70 sm:text-2xl">
              {q}
              <span className="mx-6 inline-block text-primary/40">✦</span>
            </span>
          ))}
        />
      </section>

      {/* Mission text fill */}
      <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
        <TextScrollFill
          className="text-center font-display text-3xl font-medium leading-tight tracking-tight sm:text-5xl"
          text="No black-box AI. Every recommendation traces back to a study a parent can actually read."
        />
      </section>

      {/* Proof points */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {proofPoints.map((p, i) => (
            <Reveal key={p.stat} delay={i * 100}>
              <MorphCard className="h-full p-8">
                <span className="font-display text-6xl font-medium leading-none text-primary">
                  <TextMask
                    gradient="linear-gradient(120deg, hsl(20 95% 55%), hsl(340 85% 60%), hsl(200 90% 55%))"
                    className="font-display"
                  >
                    {p.stat}
                  </TextMask>
                </span>
                <p className="mt-3 font-display text-xl font-medium tracking-tight">
                  {toTitleCase(p.label)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.sub}</p>
              </MorphCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pillars with sticky pinned heading */}
      <section className="relative border-y border-border/60 bg-muted/30">
        <ShapeScroll
          className="absolute left-0 top-10 -z-0 hidden h-80 w-80 lg:block"
          spin={140}
          scale={0.7}
          tilt={25}
          drift={-60}
          gradientFrom="hsl(200 85% 70%)"
          gradientTo="hsl(280 70% 78%)"
        />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:px-8">
          <StickyPin top="6rem">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              The evidence base
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium leading-tight sm:text-5xl">
              Six pillars hold up{" "}
              <TextMask className="font-display">every recommendation.</TextMask>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Hover any pillar to see the citation that anchors it. The bibliography below carries
              the full reference and a plain-English note for each one.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
              <BookOpen className="h-4 w-4 text-primary" /> Cite-as-you-read research design.
            </div>
          </StickyPin>

          <div className="grid gap-5 sm:grid-cols-2">
            {pillars.map((p, i) => (
              <Reveal key={p.n} delay={i * 80}>
                <HoverReveal
                  className="h-full"
                  height="100%"
                  front={
                    <div className="p-7">
                      <span className="font-display text-sm font-semibold text-primary">{p.n}</span>
                      <h3 className="mt-3 font-display text-xl font-medium tracking-tight">
                        {toTitleCase(p.title)}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                    </div>
                  }
                  back={
                    <div className="h-full rounded-3xl bg-gradient-hero p-7">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        Anchored in
                      </p>
                      <p className="mt-3 font-display text-2xl leading-snug text-foreground">
                        <Quote className="mb-2 inline h-5 w-5 text-primary/60" />
                        {p.cite}
                      </p>
                      <p className="mt-4 text-sm text-muted-foreground">
                        Full reference in the bibliography below.
                      </p>
                    </div>
                  }
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Bibliography */}
      <section id="bibliography" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Bibliography
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">
            The full reading list, with a note from us.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Each entry is paired with a short, plain-English note on how it shapes the way
            TransitionForward thinks about your child's plan.
          </p>
        </div>

        <ol className="mt-12 space-y-4">
          {citations.map((c, i) => (
            <Reveal key={c.title} delay={i * 50}>
              <li className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-hero opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-60" />
                <div className="relative flex flex-wrap items-start gap-4">
                  <span className="font-display text-3xl font-medium leading-none text-primary/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed text-foreground">
                      <span className="font-medium">{c.authors}</span> ({c.year}).{" "}
                      <em>{c.title}</em> {c.journal}
                    </p>
                    <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
                      <span>{c.note}</span>
                    </p>
                  </div>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>

        <div className="mt-14 overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-warm p-10 text-center shadow-soft">
          <h3 className="font-display text-3xl font-medium sm:text-4xl">
            Want every nudge in your child's plan tied to a source?
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-foreground/80">
            Upload an IEP and TransitionForward will hand back a grade-by-grade roadmap — every
            recommendation footnoted to one of the studies above.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Magnetic>
              <Link
                to="/waitlist"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
              >
                Join the waitlist <ArrowRight className="h-4 w-4" />
              </Link>
            </Magnetic>
            <Magnetic strength={14}>
              <Link
                to="/framework"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-muted"
              >
                See the framework <ExternalLink className="h-4 w-4" />
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
