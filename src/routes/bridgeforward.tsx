import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardList,
  MessageSquareQuote,
  Compass,
  Sparkles,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getProgramEligibility } from "@/lib/bridgeforward.functions";
import { HeroCTAs } from "@/components/site/HeroCTAs";
import { CardGrid } from "@/components/layout/CardGrid";
import {
  CompassRose,
  ArcStack,
  Sparkle,
  Squiggle,
  BookDoodle,
  Starburst,
  DotField,
  UnderlineSwoosh,
} from "@/components/effects/Decorations";
import ctMapAsset from "@/assets/ct-map-illustration.jpg.asset.json";

const ctMap = ctMapAsset.url;

export const Route = createFileRoute("/bridgeforward")({
  head: () => ({
    meta: [
      { title: "BridgeForward — Middle School Transition (Grades 6–8)" },
      {
        name: "description",
        content:
          "BridgeForward helps grade 6–8 students and families explore strengths, compare high school options, and walk into grade 9 with confidence.",
      },
      { property: "og:title", content: "BridgeForward — Grades 6–8" },
      {
        property: "og:description",
        content:
          "A gentle middle-school bridge into the right high school setting — for families, students, and educators.",
      },
    ],
  }),
  component: BridgeForwardPublicPage,
});

const STEPS = [
  {
    icon: ClipboardList,
    title: "BridgeForward Profile",
    body: "Capture strengths, supports, interests, and what high school feels like right now.",
  },
  {
    icon: MessageSquareQuote,
    title: "Student Voice (Grades 6–8)",
    body: "Age-appropriate prompts so the student's words shape the plan.",
  },
  {
    icon: Compass,
    title: "High School Fit Finder",
    body: "Compare neighborhood, magnet, technical, and specialized options side-by-side.",
  },
  {
    icon: Sparkles,
    title: "Readiness Snapshot",
    body: "A versioned summary the family can bring to the next PPT.",
  },
] as const;

const AUDIENCES = [
  "Students in grades 6, 7, and 8",
  "Parents and guardians of a middle-school student",
  "Educators and case managers supporting middle-school teams",
  "School and district administrators with middle-school students in their care",
] as const;

function BridgeForwardPublicPage() {
  const { user } = useAuth();
  const fetchElig = useServerFn(getProgramEligibility);
  const [eligible, setEligible] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setEligible(null);
      return;
    }
    let cancelled = false;
    fetchElig()
      .then((r: { hasMiddleSchoolStudent: boolean; isPartner: boolean }) => {
        if (!cancelled) setEligible(Boolean(r.hasMiddleSchoolStudent));
      })
      .catch(() => {
        if (!cancelled) setEligible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, fetchElig]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <Breadcrumbs trail={[{ label: "BridgeForward" }]} />

        {/* Hero — layered background graphics, CT map texture, floating decorations */}
        <section className="relative mt-6 overflow-hidden rounded-3xl border bg-gradient-hero p-8 shadow-soft sm:p-12">
          {/* CT map ambient backdrop */}
          <img
            src={ctMap}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-10 hidden h-[120%] w-auto select-none opacity-[0.08] sm:block"
          />
          {/* Decorative cluster */}
          <CompassRose className="pointer-events-none absolute -left-6 -top-6 hidden h-32 w-32 text-primary/15 sm:block" />
          <ArcStack className="pointer-events-none absolute bottom-0 right-0 hidden h-40 w-40 text-primary/20 sm:block" />
          <Sparkle className="pointer-events-none absolute right-12 top-8 hidden h-6 w-6 text-primary/40 sm:block" />
          <BookDoodle className="pointer-events-none absolute bottom-8 left-8 hidden h-16 w-20 text-primary/25 sm:block" />
          <DotField className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-1/3 text-primary/10 sm:block" />

          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <GraduationCap className="h-4 w-4" /> Grades 6–8 · Middle School
            </div>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium tracking-tight sm:text-5xl">
              BridgeForward
            </h1>
            <UnderlineSwoosh className="mt-2 h-3 w-56 text-primary/40" />
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              A gentle, family-friendly bridge from middle school into the right
              high school. Build a picture of who the student is today, explore
              their options, and walk into grade 9 with confidence — not
              confusion. BridgeForward is purpose-built for grades 6–8 and sits
              alongside the high school TransitionForward planning flow.
            </p>

            <HeroCTAs className="mt-6">
              {user ? (
                eligible === null ? (
                  <Button size="lg" disabled>
                    Checking access…
                  </Button>
                ) : eligible ? (
                  <>
                    <Button asChild size="lg">
                      <Link to="/bridgeforward/explore">
                        Explore High Schools
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link to="/bridgeforward/intake">Open BridgeForward Tools</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="lg">
                      <Link to="/students">Connect a Middle School Student</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link to="/help">Request Access</Link>
                    </Button>
                  </>
                )
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link to="/login">
                      Sign In to Start
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/waitlist">Join the Waitlist</Link>
                  </Button>
                </>
              )}
            </HeroCTAs>

            {user && eligible === false && (
              <p className="mt-4 text-xs text-muted-foreground">
                BridgeForward dashboard tools are available when you're connected
                to a student in grades 6–8.
              </p>
            )}
          </div>
        </section>

        {/* Soft tinted band with the four steps + decorative corners */}
        <section className="relative mt-10 overflow-hidden rounded-3xl border bg-muted/40 p-6 shadow-soft sm:p-10">
          <Starburst className="pointer-events-none absolute -right-6 -top-6 hidden h-24 w-24 text-primary/15 sm:block" />
          <ArcStack className="pointer-events-none absolute -bottom-2 left-0 hidden h-32 w-32 -scale-x-100 text-primary/15 sm:block" />

          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Compass className="h-4 w-4" /> Four Steps · Middle School to High School
            </div>
            <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">
              A clear bridge, one step at a time
            </h2>
            <Squiggle className="mt-2 h-3 w-48 text-primary/40" />

            <CardGrid columns={2} className="mt-6">
              {STEPS.map((s) => (
                <Card key={s.title} className="h-full bg-card/90 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                    <s.icon className="h-5 w-5 shrink-0 text-primary" />
                    <CardTitle className="text-base">{s.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {s.body}
                  </CardContent>
                </Card>
              ))}
            </CardGrid>
          </div>
        </section>

        {/* New: contextual image + value pairing — planning desk visual moment */}
        <section className="mt-10 overflow-hidden rounded-3xl border bg-card shadow-soft">
          <div className="grid gap-0 sm:grid-cols-[1fr_1.1fr]">
            <div className="relative aspect-[4/3] w-full sm:aspect-auto sm:min-h-[320px]">
              <img
                src={planningDesk}
                alt="A family and educator sitting at a desk reviewing high school planning notes together."
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: "center 40%" }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background/40" />
              <Sparkle className="pointer-events-none absolute right-4 top-4 h-5 w-5 text-primary/70" />
            </div>
            <div className="relative flex flex-col justify-center p-8 sm:p-10">
              <DotField className="pointer-events-none absolute -bottom-4 -right-4 hidden h-32 w-32 text-primary/10 sm:block" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <School className="h-4 w-4" /> Side-by-side comparisons
                </div>
                <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">
                  Compare High Schools Without the Guesswork
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Comprehensive publics, magnets, CTECS, specialized programs —
                  BridgeForward lays out the options that fit the student's
                  strengths and supports, with plain-language reasons and
                  questions to ask at the next visit.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {[
                    "Strengths-based match reasons",
                    "Questions to ask at open houses",
                    "Save & revisit promising options",
                  ].map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Who it's for — paired with calendar/meeting image and arc corner */}
        <section className="relative mt-10 overflow-hidden rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <ArcStack className="pointer-events-none absolute -right-2 -top-2 hidden h-32 w-32 -scale-y-100 text-primary/15 sm:block" />

          <div className="grid gap-8 sm:grid-cols-[1.1fr_1fr] sm:items-center">
            <div>
              <h2 className="font-display text-2xl font-medium tracking-tight">
                Who BridgeForward Is For
              </h2>
              <Squiggle className="mt-2 h-3 w-40 text-primary/40" />
              <ul className="mt-4 space-y-2 text-sm">
                {AUDIENCES.map((a) => (
                  <li key={a} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{a}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                BridgeForward never exposes private student data to partner
                organizations and does not duplicate the high school Pathway
                Report.
              </p>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-muted">
              <img
                src={calendarMeeting}
                alt="A family calendar and notebook open during a planning conversation."
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: "center 35%" }}
              />
              <BookDoodle className="pointer-events-none absolute bottom-3 right-3 h-12 w-16 text-primary/60" />
            </div>
          </div>
        </section>

        {/* Bottom: family-walking image moment (existing) — kept, with decorations */}
        <section className="relative mt-10 overflow-hidden rounded-3xl border bg-gradient-hero shadow-soft">
          <Sparkle className="pointer-events-none absolute right-6 top-6 z-10 h-5 w-5 text-primary/70" />
          <CompassRose className="pointer-events-none absolute -bottom-6 -left-6 z-10 hidden h-32 w-32 text-primary/15 sm:block" />

          <div className="relative grid gap-0 sm:grid-cols-[1.05fr_1fr]">
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                The Bridge to Grade 9
              </div>
              <h2 className="mt-3 font-display text-2xl font-medium tracking-tight sm:text-3xl">
                Walk Into High School Already Knowing the Way
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                BridgeForward gives families the room to talk through options
                together — comparing schools, naming supports, and shaping a
                plan the student helps write. By the time grade 9 starts, the
                first day already feels like familiar ground.
              </p>
              <HeroCTAs className="mt-6">
                <Button asChild size="lg" variant="outline">
                  <Link to="/programs/transitionforward">
                    See the High School Pathway
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </HeroCTAs>
            </div>
            <div className="relative aspect-[4/3] w-full sm:aspect-auto sm:min-h-[320px]">
              <img
                src={familyWalking}
                alt="A parent and middle-school student walking together, talking through next steps for high school."
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: "center 35%" }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent sm:from-background/60" />
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
