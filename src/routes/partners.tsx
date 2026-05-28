import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  Wrench,
  Briefcase,
  HeartHandshake,
  Sparkles,
  MapPin,
  Star,
  Compass,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import partnersHero from "@/assets/partners-hero.jpg";
import {
  CursorField,
  Magnetic,
  TextMask,
  FloatingShape,
  Tilt3D,
  TiltLayer,
} from "@/components/effects/ImmersiveEffects";
import { Parallax, Reveal, Marquee } from "@/components/effects/ScrollEffects";
import { toTitleCase } from "@/lib/title-case";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Real-world partners — TransitionForward" },
      {
        name: "description",
        content:
          "Universities, technical schools, supported-employment agencies, and Connecticut community partners — curated so families don't have to start from a blank Google search.",
      },
      { property: "og:title", content: "Real-world partners — TransitionForward" },
      {
        property: "og:description",
        content:
          "Real places, real people, real next steps. A trusted directory of Connecticut partners arriving with the pilot.",
      },
      { property: "og:image", content: partnersHero },
      { property: "twitter:image", content: partnersHero },
    ],
  }),
  component: PartnersPage,
});

const partnerTypes = [
  {
    icon: GraduationCap,
    title: "Four-year colleges",
    body: "Disability-services offices that actually pick up the phone, and admissions teams who understand IEPs.",
  },
  {
    icon: Building2,
    title: "Two-year & community colleges",
    body: "Programs that welcome IEP students, with on-ramps that meet learners exactly where they are.",
  },
  {
    icon: Wrench,
    title: "Technical & trade schools",
    body: "Welding, HVAC, automotive, culinary, healthcare — hands-on training employers are actively hiring for.",
  },
  {
    icon: Briefcase,
    title: "Supported employment",
    body: "Job coaches and career-readiness programs that walk alongside the first paycheck.",
  },
  {
    icon: HeartHandshake,
    title: "Community organizations",
    body: "Higher Heights, the RISE Network, Dalio Education, and other Connecticut groups doing this work for years.",
  },
  {
    icon: Sparkles,
    title: "Mentors & alumni",
    body: "Young adults who walked this path five years ago and are willing to text a family at 9pm.",
  },
];

const principles = [
  {
    n: "01",
    title: "Vetted, not aggregated",
    body: "Every partner is reviewed by someone who has actually called, visited, or worked with them — not scraped from a directory.",
  },
  {
    n: "02",
    title: "Matched to the student",
    body: "Opportunities surface based on a student's interests, strengths, and goals — not generic lists for everyone.",
  },
  {
    n: "03",
    title: "Reachable in plain language",
    body: "What the program does, who it's for, what it costs, how to apply — translated so families never decode a brochure.",
  },
  {
    n: "04",
    title: "Connecticut first",
    body: "We start where we live. The first directory is built for Connecticut families, then expands with the pilot.",
  },
];

const featuredCtPartners = [
  "Higher Heights",
  "RISE Network",
  "Dalio Education",
  "CT BOR Community Colleges",
  "CT Tech Education System",
  "BRS Connecticut",
  "ARC Connecticut",
  "Best Buddies CT",
];

/* Decorative SVG that lives in card backgrounds — adds illustration energy
   without obstructing copy. */
function GridBurst({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden
      className={className}
      style={{ stroke: "currentColor", fill: "none", strokeWidth: 0.6 }}
    >
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <line
            key={i}
            x1="100"
            y1="100"
            x2={100 + Math.cos(a) * 96}
            y2={100 + Math.sin(a) * 96}
          />
        );
      })}
      <circle cx="100" cy="100" r="38" />
      <circle cx="100" cy="100" r="62" opacity="0.5" />
      <circle cx="100" cy="100" r="86" opacity="0.25" />
    </svg>
  );
}

function CornerArc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden className={className} fill="none">
      <path
        d="M 0 160 A 160 160 0 0 1 160 0"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />
      <path
        d="M 0 160 A 110 110 0 0 1 110 50"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.35"
      />
      <path
        d="M 0 160 A 60 60 0 0 1 60 100"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.2"
      />
    </svg>
  );
}

function PartnersPage() {
  return (
    <SiteShell>
      {/* ============ HERO ============ */}
      <CursorField className="relative">
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />

          <FloatingShape className="absolute right-[4%] top-16 -z-10" duration={18}>
            <div className="h-56 w-56 rounded-full bg-peach/30 blur-3xl" />
          </FloatingShape>
          <FloatingShape className="absolute left-[6%] bottom-10 -z-10" delay={2} duration={22}>
            <div className="h-44 w-44 rounded-full bg-sky/30 blur-3xl" />
          </FloatingShape>

          {/* Decorative compass illustration top-right */}
          <FloatingShape
            className="pointer-events-none absolute right-6 top-24 hidden text-primary/30 lg:block"
            duration={28}
          >
            <Compass className="h-28 w-28" strokeWidth={1} />
          </FloatingShape>
          {/* Decorative star cluster */}
          <FloatingShape
            className="pointer-events-none absolute left-[42%] top-10 hidden text-peach/60 lg:block"
            duration={24}
            delay={1}
          >
            <Star className="h-8 w-8" strokeWidth={1.2} />
          </FloatingShape>

          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-20 pb-16 sm:px-6 md:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-28 lg:pb-24">
            <div>
              <Reveal>
                <p className="inline-flex items-center gap-2 border-l-2 border-primary pl-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  <MapPin className="h-3.5 w-3.5" /> Real-world partners
                </p>
              </Reveal>
              <h1 className="mt-7 font-display text-[clamp(2.25rem,6.5vw,5.75rem)] font-medium leading-[0.98] tracking-tight">
                <Reveal>
                  <span className="block">Real places.</span>
                </Reveal>
                <Reveal delay={120}>
                  <span className="block">Real people.</span>
                </Reveal>
                <Reveal delay={240}>
                  <span className="block">
                    Real{" "}
                    <TextMask gradient="linear-gradient(120deg, oklch(0.78 0.12 50), oklch(0.78 0.1 220), oklch(0.82 0.1 25))">
                      next steps
                    </TextMask>
                    .
                  </span>
                </Reveal>
              </h1>
              <Reveal delay={340}>
                <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground">
                  The pathways your student might take are not abstractions. They are universities,
                  technical schools, employers, and community organizations doing this work right
                  now — curated so families don't have to start from a blank Google search.
                </p>
              </Reveal>
              <Reveal delay={420}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Magnetic>
                    <Link
                      to="/waitlist"
                      className="inline-flex items-center gap-2 bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lift hover:shadow-soft"
                    >
                      Join the pilot <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Magnetic>
                  <Magnetic>
                    <Link
                      to="/platform"
                      className="inline-flex items-center justify-center border border-foreground/20 bg-background/90 px-7 py-3 text-sm font-semibold backdrop-blur hover:bg-background"
                    >
                      How matching works
                    </Link>
                  </Magnetic>
                </div>
              </Reveal>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 -z-10 bg-gradient-warm opacity-60 blur-2xl" />
              {/* Decorative arc behind image */}
              <CornerArc className="pointer-events-none absolute -left-6 -top-6 -z-10 h-40 w-40 text-primary/40" />
              <Parallax speed={0.18}>
                <img
                  src={partnersHero}
                  alt="A constellation of families, educators, mentors, and employers connected by glowing pathways"
                  width={1600}
                  height={1200}
                  className="aspect-[4/3] w-full object-cover shadow-lift"
                />
              </Parallax>
              {/* Decorative dot grid bottom-right */}
              <svg
                aria-hidden
                viewBox="0 0 80 80"
                className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 text-primary/40"
              >
                {Array.from({ length: 8 }).map((_, y) =>
                  Array.from({ length: 8 }).map((_, x) => (
                    <circle key={`${x}-${y}`} cx={x * 10 + 5} cy={y * 10 + 5} r="1.2" fill="currentColor" />
                  )),
                )}
              </svg>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <div className="border-y border-foreground/15 bg-card/60 backdrop-blur-sm">
          <Marquee
            speed={40}
            className="py-5 font-display text-2xl italic text-foreground/70 sm:text-3xl"
            items={featuredCtPartners.map((p) => (
              <span key={p} className="inline-flex items-center">
                {p}
                <span className="ml-8 text-primary">·</span>
              </span>
            ))}
          />
        </div>
      </CursorField>

      {/* ============ THE PARTNER NETWORK ============ */}
      <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Decorative SVG in section blank space */}
        <FloatingShape
          className="pointer-events-none absolute right-[2%] top-10 hidden text-sky/40 lg:block"
          duration={26}
        >
          <GridBurst className="h-40 w-40" />
        </FloatingShape>

        <Reveal>
          <p className="border-l-2 border-primary pl-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            The network
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            {toTitleCase("Six kinds of partners, one connected directory.")}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Every partner type is matched to student interests, goals, and IEP context — so the
            right opportunity finds the right student at the right moment.
          </p>
        </Reveal>

        {/* Open editorial grid — no rounded boxes, big icons, illustrative backgrounds */}
        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {partnerTypes.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 70}>
              <article className="group relative border-t-2 border-foreground/15 pt-6">
                {/* Decorative burst behind icon */}
                <GridBurst className="pointer-events-none absolute -left-6 -top-2 h-28 w-28 text-primary/15 transition-opacity group-hover:text-primary/30" />
                <div className="relative flex items-start gap-5">
                  <div className="relative shrink-0">
                    <div className="absolute -inset-3 -z-10 bg-gradient-warm opacity-50 blur-xl transition-opacity group-hover:opacity-90" />
                    <Icon
                      className="h-12 w-12 text-primary transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110"
                      strokeWidth={1.4}
                    />
                  </div>
                  <span className="ml-auto font-display text-sm tabular-nums text-foreground/30">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-2xl font-medium leading-tight tracking-tight">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ PRINCIPLES — EDITORIAL LIST ============ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-sky-soft/30 py-24">
        <FloatingShape
          className="pointer-events-none absolute left-[3%] top-16 hidden text-peach/45 lg:block"
          duration={24}
        >
          <Star className="h-16 w-16" strokeWidth={1.1} />
        </FloatingShape>
        <FloatingShape
          className="pointer-events-none absolute right-[4%] bottom-10 hidden text-sky/40 lg:block"
          duration={28}
          delay={1.5}
        >
          <Compass className="h-20 w-20" strokeWidth={1} />
        </FloatingShape>

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <p className="border-l-2 border-primary pl-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              How we curate
            </p>
            <h2 className="mt-4 max-w-3xl font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
              {toTitleCase("Vetted by humans. Matched to students.")}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              A directory is only as good as the work behind it. Here is how we keep the partner
              network honest.
            </p>
          </Reveal>

          <ul className="mt-12 divide-y divide-foreground/15 border-y border-foreground/15">
            {principles.map(({ n, title, body }, i) => (
              <li key={n}>
                <Reveal delay={i * 70}>
                  <article className="group grid grid-cols-[auto_1fr] items-start gap-6 py-8 sm:grid-cols-[6rem_1fr_auto] sm:gap-10">
                    <span className="font-display text-5xl font-medium tabular-nums leading-none text-primary/35 transition-colors group-hover:text-primary/70 sm:text-6xl">
                      {n}
                    </span>
                    <div className="col-span-1">
                      <h3 className="font-display text-2xl font-medium leading-tight tracking-tight sm:text-3xl">
                        {title}
                      </h3>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {body}
                      </p>
                    </div>
                    <ArrowRight
                      className="col-span-2 hidden h-6 w-6 self-center text-primary/40 transition-all group-hover:translate-x-2 group-hover:text-primary sm:col-span-1 sm:block"
                      strokeWidth={1.5}
                    />
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ CTA — OPEN COMPOSITION ============ */}
      <section className="relative mx-auto max-w-6xl overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
        <FloatingShape
          className="pointer-events-none absolute left-[4%] top-16 hidden text-primary/25 lg:block"
          duration={26}
        >
          <GridBurst className="h-48 w-48" />
        </FloatingShape>

        <div className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="border-l-2 border-primary pl-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Become a partner
            </p>
            <h3 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
              {toTitleCase("Are you doing this work? We want to walk with you.")}
            </h3>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              If your program serves students with IEPs — at a university, a tech school, an
              employer, or a community organization — we'd love to add you to the directory the
              pilot launches with.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Magnetic>
                <Link
                  to="/waitlist"
                  className="inline-flex items-center gap-2 bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lift hover:shadow-soft"
                >
                  Get in touch <ArrowRight className="h-4 w-4" />
                </Link>
              </Magnetic>
              <Magnetic>
                <Link
                  to="/about"
                  className="inline-flex items-center justify-center border border-foreground/20 bg-background/90 px-7 py-3 text-sm font-semibold backdrop-blur hover:bg-background"
                >
                  Read our story
                </Link>
              </Magnetic>
            </div>
          </div>

          {/* Editorial word collage — no rounded boxes, large typographic gestures */}
          <Tilt3D max={6} glare={false} className="relative">
            <TiltLayer depth={0}>
              <div className="relative grid grid-cols-2 gap-x-6 gap-y-4 font-display text-foreground/80">
                {[
                  { w: "Trust", s: "text-5xl sm:text-6xl", c: "text-primary" },
                  { w: "Vetted", s: "text-3xl sm:text-4xl italic" },
                  { w: "Local", s: "text-4xl sm:text-5xl" },
                  { w: "Matched", s: "text-3xl sm:text-4xl italic text-primary/80" },
                  { w: "Plain language", s: "text-2xl sm:text-3xl col-span-2" },
                  { w: "Connecticut", s: "text-4xl sm:text-5xl col-span-2 italic" },
                ].map(({ w, s, c }) => (
                  <span key={w} className={`block leading-none ${s} ${c ?? ""}`}>
                    {w}
                  </span>
                ))}
                <CornerArc className="pointer-events-none absolute -bottom-6 -right-6 -z-10 h-32 w-32 text-primary/30" />
              </div>
            </TiltLayer>
          </Tilt3D>
        </div>

        <p className="mx-auto mt-16 max-w-xl text-center font-display text-xl italic text-foreground/70">
          One platform. One plan. Forward together.
        </p>
      </section>
    </SiteShell>
  );
}
