import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import {
  User,
  Target,
  Sparkles,
  ClipboardList,
  MessageCircle,
  FileDown,
} from "lucide-react";
import educatorsHero from "@/assets/bundled/red-head-teacher-stressed.webp";
import dashboardImg from "@/assets/bundled/happy-teacher-morning.webp";
import frameworkImg from "@/assets/bundled/calendar-meeting.webp";
import iepUploadImg from "@/assets/bundled/iep-binder.webp";

import {
  Parallax,
  ParallaxImage,
  Reveal,
  ShapeScroll,
  StickyScrollStory,
  Marquee,
  TextScrollFill,
} from "@/components/effects/ScrollEffects";

import { toTitleCase } from "@/lib/title-case";
export const Route = createFileRoute("/educators")({
  head: () => ({
    meta: [
      { title: "For Educators | TransitionForward" },
      { name: "description", content: "Less paperwork, more support. Transition goal tracking, PPT prep, and family communication built for CT special educators." },
      { property: "og:title", content: "For Educators | TransitionForward" },
      { property: "og:description", content: "Less Paperwork, More Student Support, built for CT special educators." },
      { property: "og:url", content: "/educators" },
      { property: "og:image", content: educatorsHero },
    ],
    links: [
      { rel: "canonical", href: "/educators" },
      { rel: "preconnect", href: "https://images.unsplash.com", crossOrigin: "" },
      { rel: "preload", as: "image", href: educatorsHero, fetchpriority: "high" },
    ],
    scripts: [
      {

        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Transition Planning for Educators",
          description: "Transition goal tracking, PPT meeting prep, and family communication tools built for Connecticut special educators.",
          provider: { "@type": "Organization", name: "TransitionForward", url: "/" },
          areaServed: "Connecticut, USA",
          audience: { "@type": "Audience", audienceType: "Special educators and case managers" },
        }),
      },
    ],
  }),
  component: EducatorsPage,
});

const cards = [
  { icon: User, t: "Student Transition Snapshot", b: "Strengths, interests, goals, supports, and family input. One screen per student, always current." },
  { icon: Target, t: "Goal and Progress Alignment", b: "Goal to skill to evidence to next step. Progress reports finally match what the goal actually says." },
  { icon: Sparkles, t: "Expert Drafted, Teacher Approved", b: "Pathway recommendations, meeting summaries, and family friendly translations drafted by our specialist formulas for you to edit. Nothing leaves your hands without your review." },
  { icon: ClipboardList, t: "PPT Prep, Ready to Print", b: "Agenda, strengths summary, concerns, requested next steps, and a plain language meeting summary template, generated in one click." },
  { icon: MessageCircle, t: "Family Communication Log", b: "Notes, questions, and responses in one place, so context does not live in your inbox." },
  { icon: FileDown, t: "Exportable PDF Summaries", b: "Hand families something they can actually read. Hand admins something that documents the work you are already doing." },
];

const marqueeQuotes = [
  "“Finally — meeting prep that doesn't eat my Sunday night.”",
  "“The plain-language summaries land. Parents come ready.”",
  "“Goals → evidence → next step, all in one place.”",
  "“It writes the draft. I keep the judgement.”",
  "“My caseload feels organized for the first time in years.”",
  "“PPT packets in one click. I almost cried.”",
];

const storyPanels = [
  {
    title: "Monday morning, before homeroom.",
    body: "Open one screen and see every student's transition snapshot — strengths, goals, last family note, and what's overdue. No more digging through six tabs to remember where Jordan left off.",
    image: dashboardImg,
    alt: "Educator dashboard showing a caseload snapshot",
  },
  {
    title: "Wednesday, the IEP arrives.",
    body: "Drop the PDF in. We pull out goals, services, and accommodations, then translate the transition pieces into plain language families and students can actually use.",
    image: iepUploadImg,
    alt: "IEP upload and plain-language summary",
  },
  {
    title: "Friday, the PPT lands on the calendar.",
    body: "One click for the agenda, talking points, strengths summary, and family follow-up letter. Edit, print, walk in ready.",
    image: frameworkImg,
    alt: "Generated PPT meeting prep packet",
  },
];

function EducatorsPage() {
  return (
    <SiteShell>
      {/* HERO with parallax image + drifting shape */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <ShapeScroll
          className="absolute -left-24 top-20 -z-10 hidden h-80 w-80 text-primary/15 md:block"
          spin={120}
          scale={0.4}
        />
        <ShapeScroll
          className="absolute -right-28 bottom-0 -z-10 hidden h-96 w-96 text-amber-300/25 md:block"
          spin={-80}
          scale={0.35}
        />

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-24 lg:pb-16">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">For Educators</p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              Built to Give You Your <span className="text-primary">Evenings</span> Back.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              TransitionForward is not another system of record. It is a quiet companion that organizes
              transition planning, surfaces student and family input, and drafts the language you
              already write, so you can review, edit, and approve instead of starting from scratch.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
              <Link to="/demo" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">See the Pathway Builder</Link>
              <Link to="/waitlist" className="inline-flex items-center justify-center rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-muted">Bring It to Your School</Link>
            </div>
          </Reveal>
          <Reveal delay={120} y={36}>
            <div className="relative">
              <Parallax speed={-0.18} className="absolute -inset-3 -z-10">
                <div className="h-full w-full rounded-[2rem] bg-gradient-warm opacity-60 blur-2xl" />
              </Parallax>
              <ParallaxImage
                src={educatorsHero}
                
                sizes="(min-width: 1024px) 50vw, 100vw"
                eager
                alt="Illustrated teacher desk at golden hour with a constellation of Sticky Notes wired to a glowing lightbulb"
                width={1600}
                height={1200}
                speed={0.3}

                className="aspect-[4/3] w-full rounded-[2rem] shadow-lift"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* MARQUEE — what teachers are saying */}
      <section aria-label="Educator quotes" className="border-y border-border/40 bg-background py-6">
        <Marquee
          speed={60}
          items={marqueeQuotes.map((q, i) => (
            <span
              key={i}
              className="font-display text-xl italic text-foreground/80 sm:text-2xl"
            >
              {q}
              <span className="mx-6 inline-block text-primary/40">✦</span>
            </span>
          ))}
        />
      </section>

      {/* FEATURE CARDS with staggered reveal */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            What you get
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Six Tools, One Quieter Week.
          </h2>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ icon: Icon, t, b }, i) => (
            <Reveal key={t} delay={i * 80} y={28}>
              <article className="group h-full rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-sky text-primary-foreground transition-transform group-hover:rotate-6 group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-xl font-medium tracking-tight">{toTitleCase(t)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* STICKY SCROLL STORY — a week in the platform */}
      <section className="relative border-t border-border/40 bg-muted/30 py-16">
        <ShapeScroll
          className="absolute right-4 top-10 hidden h-40 w-40 text-primary/10 lg:block"
          spin={180}
          scale={0.5}
        />
        <StickyScrollStory
          eyebrow="A week in the platform"
          title={<>Scroll Through <span className="bg-gradient-to-r from-primary via-sky to-peach bg-clip-text italic text-transparent">Your Week</span>.</>}
          panels={storyPanels}
        />
      </section>

      {/* TEXT SCROLL FILL — a mission line that lights up */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <TextScrollFill
          className="font-display text-3xl font-medium leading-tight tracking-tight sm:text-5xl"
          text="You went into teaching to change lives — not to write the same transition goal seven times. We hold the paperwork so you can hold the room."
        />
      </section>

      {/* CTA with parallax background shape */}
      <section className="relative overflow-hidden border-t border-border/40 bg-gradient-hero py-14">
        <Parallax speed={0.4} className="absolute -right-20 -top-20 -z-10">
          <ShapeScroll className="h-[28rem] w-[28rem] text-primary/20" spin={60} scale={0.3} />
        </Parallax>
        <Parallax speed={-0.3} className="absolute -left-24 bottom-0 -z-10">
          <ShapeScroll className="h-80 w-80 text-amber-300/30" spin={-100} scale={0.4} />
        </Parallax>
        <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Ready to Get Your Evenings Back?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Try the Pathway Builder yourself, or bring it to your team for a pilot.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/demo" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">See the Pathway Builder</Link>
            <Link to="/waitlist" className="inline-flex items-center justify-center rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-background">Bring It to Your School</Link>
          </div>
        </Reveal>
      </section>

    </SiteShell>
  );
}
