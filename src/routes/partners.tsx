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
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import partnersHero from "@/assets/partners-hero.jpg";
import {
  CursorField,
  Magnetic,
  HoverReveal,
  TextMask,
  StickyPin,
  MorphCard,
  FloatingShape,
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
    body: "With disability-services offices that actually pick up the phone, and admissions teams who understand IEPs.",
    accent: "from-sky/30 to-sky-soft/30",
  },
  {
    icon: Building2,
    title: "Two-year & community colleges",
    body: "Programs that welcome IEP students, with on-ramps that meet learners exactly where they are.",
    accent: "from-peach-soft/40 to-sky-soft/30",
  },
  {
    icon: Wrench,
    title: "Technical & trade schools",
    body: "Hands-on training in fields employers are actively hiring for — welding, HVAC, automotive, culinary, healthcare.",
    accent: "from-peach/30 to-peach-soft/30",
  },
  {
    icon: Briefcase,
    title: "Supported employment",
    body: "Job coaches, supported-employment agencies, and career-readiness programs that walk alongside the first paycheck.",
    accent: "from-sky-soft/35 to-peach/30",
  },
  {
    icon: HeartHandshake,
    title: "Community organizations",
    body: "Higher Heights, the RISE Network, Dalio Education, and other Connecticut groups doing this work for years.",
    accent: "from-peach-soft/35 to-sky/30",
  },
  {
    icon: Sparkles,
    title: "Mentors & alumni",
    body: "Young adults who walked this path five years ago and are willing to text a family at 9pm.",
    accent: "from-sky/30 to-peach/30",
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
    body: "What the program does, who it's for, what it costs, how to apply — translated so families never have to decode a brochure.",
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

function PartnersPage() {
  return (
    <SiteShell>
      {/* ============ HERO ============ */}
      <CursorField className="relative">
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
          <FloatingShape className="absolute right-[6%] top-12 -z-10" duration={18}>
            <div className="h-56 w-56 rounded-full bg-peach/30 blur-3xl" />
          </FloatingShape>
          <FloatingShape className="absolute left-[8%] bottom-10 -z-10" delay={2} duration={22}>
            <div className="h-44 w-44 rounded-full bg-sky/30 blur-3xl" />
          </FloatingShape>

          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-20 pb-16 sm:px-6 md:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-28 lg:pb-24">
            <div>
              <Reveal>
                <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary backdrop-blur">
                  <MapPin className="h-3.5 w-3.5" /> Real-world partners
                </p>
              </Reveal>
              <h1 className="mt-7 font-display text-[clamp(2.5rem,7vw,6.5rem)] font-medium leading-[0.98] tracking-tight">
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
                <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  The pathways your student might take are not abstractions. They are universities,
                  technical schools, employers, and community organizations doing this work right
                  now — curated so families don't have to start from a blank Google search.
                </p>
              </Reveal>
              <Reveal delay={420}>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Magnetic>
                    <Link
                      to="/waitlist"
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lift hover:shadow-soft"
                    >
                      Join the pilot <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Magnetic>
                  <Magnetic>
                    <Link
                      to="/platform"
                      className="inline-flex items-center justify-center rounded-full border border-border bg-background/90 px-7 py-3 text-sm font-semibold backdrop-blur hover:bg-background"
                    >
                      How matching works
                    </Link>
                  </Magnetic>
                </div>
              </Reveal>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[2.2rem] bg-gradient-warm opacity-60 blur-2xl" />
              <Parallax speed={0.18}>
                <img
                  src={partnersHero}
                  alt="A constellation of families, educators, mentors, and employers connected by glowing pathways"
                  width={1600}
                  height={1200}
                  className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift"
                />
              </Parallax>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <div className="border-y border-border/50 bg-card/60 backdrop-blur-sm">
          <Marquee speed={40} className="py-5 font-display text-2xl italic text-foreground/70 sm:text-3xl">
            {featuredCtPartners.map((p) => (
              <span key={p} className="mx-8 inline-flex items-center">
                {p}
                <span className="ml-8 text-primary">·</span>
              </span>
            ))}
            {featuredCtPartners.map((p) => (
              <span key={`${p}-b`} className="mx-8 inline-flex items-center">
                {p}
                <span className="ml-8 text-primary">·</span>
              </span>
            ))}
          </Marquee>
        </div>
      </CursorField>

      {/* ============ THE PARTNER NETWORK ============ */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
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

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {partnerTypes.map(({ icon: Icon, title, body, accent }) => (
            <HoverReveal
              key={title}
              height="240px"
              className={`bg-gradient-to-br ${accent}`}
              front={
                <div className="flex h-[240px] flex-col justify-between p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/80 text-primary shadow-soft">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-medium leading-tight tracking-tight">
                      {title}
                    </h3>
                  </div>
                </div>
              }
              back={
                <div className="flex h-full flex-col justify-end">
                  <p className="text-sm leading-relaxed text-foreground/85">{body}</p>
                </div>
              }
            />
          ))}
        </div>
      </section>

      {/* ============ STICKY PRINCIPLES ============ */}
      <section className="relative bg-gradient-to-b from-background to-sky-soft/30 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
          <StickyPin top="8rem">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                How we curate
              </p>
              <h2 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
                {toTitleCase("Vetted by humans. Matched to students.")}
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
                A directory is only as good as the work behind it. Here is how we keep the
                partner network honest.
              </p>
            </div>
          </StickyPin>

          <div className="space-y-5">
            {principles.map(({ n, title, body }, i) => (
              <Reveal key={n} delay={i * 80}>
                <article className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex items-start gap-6">
                    <span className="font-display text-5xl font-medium leading-none text-primary/40">
                      {n}
                    </span>
                    <div>
                      <h3 className="font-display text-2xl font-medium leading-tight tracking-tight">
                        {title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MORPH CTA ============ */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <MorphCard className="bg-gradient-to-br from-peach-soft/40 via-background to-sky-soft/40">
          <div className="grid items-center gap-10 p-10 md:grid-cols-[1.1fr_1fr] md:p-14">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
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
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lift hover:shadow-soft"
                  >
                    Get in touch <ArrowRight className="h-4 w-4" />
                  </Link>
                </Magnetic>
                <Magnetic>
                  <Link
                    to="/about"
                    className="inline-flex items-center justify-center rounded-full border border-border bg-background/90 px-7 py-3 text-sm font-semibold backdrop-blur hover:bg-background"
                  >
                    Read our story
                  </Link>
                </Magnetic>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {["Trust", "Vetted", "Local", "Matched", "Plain language", "Connecticut"].map((w, i) => (
                <div
                  key={w}
                  className="rounded-2xl border border-border/60 bg-background/70 px-4 py-5 text-center font-display text-base italic text-foreground/75 shadow-soft"
                  style={{ transform: `rotate(${(i % 2 === 0 ? -1.5 : 1.5)}deg)` }}
                >
                  {w}
                </div>
              ))}
            </div>
          </div>
        </MorphCard>

        <p className="mx-auto mt-14 max-w-xl text-center font-display text-xl italic text-foreground/70">
          One platform. One plan. Forward together.
        </p>
      </section>
    </SiteShell>
  );
}
