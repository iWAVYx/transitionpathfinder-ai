import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import {
  BookOpen,
  Heart,
  TrendingUp,
  MapPin,
  ClipboardCheck,
  Archive,
} from "lucide-react";
import familiesHero from "@/assets/families-hero-v2.jpg";
import {
  Parallax,
  ParallaxImage,
  Reveal,
  ShapeScroll,
  Marquee,
  TextScrollFill,
} from "@/components/effects/ScrollEffects";
import { FloatingShape } from "@/components/effects/ImmersiveEffects";
import {
  DotField,
  Squiggle,
  Starburst,
  Sparkle,
  ArrowDoodle,
  PaperPlane,
  BookDoodle,
  CompassRose,
  Confetti,
  UnderlineSwoosh,
  ArcStack,
} from "@/components/effects/Decorations";




import { toTitleCase } from "@/lib/title-case";
export const Route = createFileRoute("/families")({
  head: () => ({
    meta: [
      { title: "For Families | TransitionForward" },
      { name: "description", content: "Plain Language Transition Planning for Connecticut Families. Understand the IEP, see your child's progress, ask the right questions, and find real resources." },
      { property: "og:title", content: "For Families | TransitionForward" },
      { property: "og:description", content: "Plain Language Transition Planning for Connecticut Families." },
    ],
  }),
  component: FamiliesPage,
});

const cards = [
  { icon: BookOpen, t: "Understand the Plan, in Plain Language", b: "Paste any transition goal and we will explain what it means, why it matters, and what progress should look like at home." },
  { icon: Heart, t: "Your Voice Belongs Here", b: "A space for your hopes, your concerns, and the questions you want to bring to the next PPT. Saved between meetings, not lost in them." },
  { icon: TrendingUp, t: "See Real Progress", b: "Goals connected to skills, evidence, and the next gentle step, so you can tell if your child is actually moving forward." },
  { icon: MapPin, t: "Find What They Actually Need", b: "Connecticut aware resources matched to your child's interests and grade. Community colleges, BRS, technical schools, job training, and internships." },
  { icon: ClipboardCheck, t: "Walk Into PPTs Prepared", b: "A printable meeting prep sheet with strengths, concerns, questions, and your family priorities, ready in minutes." },
  { icon: Archive, t: "Hold Onto the History", b: "Assessments, work samples, and reflections in one place. Growth over years stays visible instead of buried in folders." },
];

function FamiliesPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <ShapeScroll
          className="absolute -left-32 -top-20 -z-10 h-[36rem] w-[36rem] mix-blend-multiply"
          spin={180}
          scale={0.9}
          tilt={40}
          drift={120}
          gradientFrom="hsl(20 90% 75%)"
          gradientTo="hsl(340 85% 75%)"
        />
        <ShapeScroll
          className="absolute -right-24 top-40 -z-10 hidden h-[24rem] w-[24rem] mix-blend-multiply lg:block"
          spin={-140}
          scale={0.7}
          tilt={30}
          drift={-80}
          gradientFrom="hsl(210 90% 78%)"
          gradientTo="hsl(280 70% 78%)"
        />
        <DotField className="absolute inset-x-0 top-0 -z-10 h-40 text-primary/15" />
        <FloatingShape className="absolute left-6 top-24 -z-0 hidden h-10 w-10 text-primary/50 lg:block" delay={0.2}>
          <Sparkle className="h-full w-full" />
        </FloatingShape>
        <FloatingShape className="absolute left-[42%] top-10 -z-0 hidden h-8 w-8 text-secondary-foreground/50 md:block" duration={14} delay={1}>
          <Sparkle className="h-full w-full" />
        </FloatingShape>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-24 lg:pb-16">
          <Reveal y={36}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">For Families</p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              You Are Not Supposed to Figure This Out Alone.
              <UnderlineSwoosh className="mt-2 block h-3 w-72 text-primary/60" />
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Transition planning is a lot. Goals written in school system language, services that
              change every year, decisions that feel enormous. TransitionForward sits next to you
              and gently translates, so you can see what is happening, what to ask, and what to do next.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift">Create a Pathway Report</Link>
              <Link to="/waitlist" className="inline-flex items-center justify-center rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-muted">Join the Waitlist</Link>
              <ArrowDoodle className="ml-1 hidden h-12 w-16 -translate-y-2 rotate-[10deg] text-primary/60 sm:block" />
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-warm blur-2xl opacity-60" />
              <FloatingShape className="absolute -left-10 -top-6 z-10 h-16 w-16 text-primary/80" delay={0.4} duration={16}>
                <PaperPlane className="h-full w-full" />
              </FloatingShape>
              <FloatingShape className="absolute -right-6 bottom-8 z-10 h-20 w-20 text-secondary-foreground/70" delay={1.2} duration={20}>
                <BookDoodle className="h-full w-full" />
              </FloatingShape>
              <Confetti className="absolute -bottom-6 left-6 z-10 h-16 w-24" />
              <Parallax speed={-0.15}>
                <ParallaxImage
                  src={familiesHero}
                  alt="Hand-cut paper collage of a parent holding a paper boat folded from an IEP page beside a child's drawing"
                  width={1600}
                  height={1200}
                  speed={0.4}
                  className="aspect-[4/3] w-full rounded-[2rem] shadow-lift"
                />
              </Parallax>
            </div>
          </Reveal>
        </div>
      </section>


      {/* Voices marquee */}
      <section aria-label="Family voices" className="border-y border-border/40 bg-muted/30 py-6">
        <Marquee
          speed={70}
          items={[
            "“I finally know what to ask at the PPT.”",
            "“The translator turned the IEP into plain English.”",
            "“We saw her progress for the first time, year over year.”",
            "“The 30-day plan made the whole thing feel doable.”",
            "“Resources matched to our town, not a generic list.”",
          ].map((q, i) => (
            <span key={i} className="font-display text-xl italic text-foreground/75 sm:text-2xl">
              {q}
              <span className="mx-6 inline-block text-primary/40">✦</span>
            </span>
          ))}
        />
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Starburst className="absolute left-8 top-12 hidden h-20 w-20 text-primary/30 md:block" />
        <CompassRose className="absolute right-10 top-16 hidden h-24 w-24 text-secondary-foreground/30 lg:block" />
        <Squiggle className="absolute inset-x-0 bottom-6 mx-auto hidden h-6 w-80 text-primary/30 sm:block" />
        <Reveal>
          <TextScrollFill
            className="mx-auto max-w-4xl text-center font-display text-3xl font-medium leading-tight tracking-tight sm:text-5xl"
            text="You don't need a degree in special education to be the expert on your own child — you just need a plan you can read."
          />
        </Reveal>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <ShapeScroll
          className="absolute -right-10 top-10 -z-10 hidden h-72 w-72 text-amber-300/25 lg:block"
          spin={160}
          scale={0.6}
          tilt={20}
        />
        <ArcStack className="absolute -left-10 bottom-0 -z-10 hidden h-56 w-56 text-primary/20 lg:block" />
        <DotField className="absolute right-0 top-0 -z-10 hidden h-40 w-40 text-primary/15 md:block" />
        <FloatingShape className="absolute left-1/3 top-2 -z-0 hidden h-7 w-7 text-secondary-foreground/60 md:block" delay={0.5}>
          <Sparkle className="h-full w-full" />
        </FloatingShape>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ icon: Icon, t, b }, i) => (
            <Reveal key={t} delay={i * 80}>
              <article className="group h-full rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-sky text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-xl font-medium tracking-tight">{toTitleCase(t)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

    </SiteShell>
  );
}

