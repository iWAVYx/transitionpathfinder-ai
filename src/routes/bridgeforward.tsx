import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/site/SiteShell";
import { FaqSection } from "@/components/site/FaqSection";
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

const BRIDGE_FAQ = [
  {
    question: "What age group is BridgeForward for?",
    answer:
      "BridgeForward is designed for students in grades 6–8 and their families, educators, and case managers. It focuses on the transition from middle school to high school, before the full TransitionForward post-secondary plan begins.",
  },
  {
    question: "How does BridgeForward differ from the high school TransitionForward plan?",
    answer:
      "BridgeForward is a lighter, middle-school-focused bridge that helps families explore high school options, gather student voice, and prepare for the PPT. It does not replace the high school Pathway Report or post-secondary planning tools.",
  },
  {
    question: "Is my student's data private?",
    answer:
      "Yes. Student information is protected by strict role-based access and row-level security. BridgeForward never exposes private student data to partner organizations or other families.",
  },
  {
    question: "Do I need a school or district plan to use it?",
    answer:
      "Families can use BridgeForward during the pilot at no cost. Educators and case managers can use it when connected to a student in grades 6–8 through their school or district account.",
  },
  {
    question: "Can a teacher or case manager use BridgeForward with a family?",
    answer:
      "Yes. BridgeForward is built for collaboration. Teachers, case managers, and families can each contribute to the same student plan while respecting privacy and role-based permissions.",
  },
];

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

        {/* Hero — layered background graphics, floating decorations */}
        <section className="relative mt-6 overflow-hidden rounded-3xl border bg-gradient-hero p-8 shadow-soft sm:p-12">
          {/* Decorative cluster */}
          <CompassRose className="pointer-events-none absolute -left-6 -top-6 hidden h-32 w-32 text-primary/15 sm:block" />
          <ArcStack className="pointer-events-none absolute bottom-0 right-0 hidden h-40 w-40 text-primary/20 sm:block" />
          <Sparkle className="pointer-events-none absolute right-12 top-8 hidden h-6 w-6 text-primary/40 sm:block" />
          <BookDoodle className="pointer-events-none absolute bottom-8 left-8 hidden h-16 w-20 text-primary/25 sm:block" />
          <DotField className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-1/3 text-primary/10 sm:block" />

          <div className="relative">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
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
                    <Link to="/login" search={{ redirect: "/dashboard" }}>
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

        {/* Who it's for */}
        <section className="relative mt-10 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-sky-soft to-peach-soft p-6 shadow-soft sm:p-8">
          <ArcStack className="pointer-events-none absolute -right-2 -top-2 hidden h-32 w-32 -scale-y-100 text-primary/25 sm:block" />
          <BookDoodle className="pointer-events-none absolute bottom-4 right-6 hidden h-14 w-16 text-primary/25 sm:block" />

          <div className="relative flex flex-col items-center text-center sm:items-start sm:text-left">
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
              Who BridgeForward Is For
            </h2>
            <Squiggle className="mt-2 h-3 w-40 text-primary/60" />
            <ul className="mt-4 inline-flex flex-col items-start gap-2 text-left text-sm sm:text-base">
              {AUDIENCES.map((a) => (
                <li key={a} className="flex items-start gap-2 text-left">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{a}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-2xl text-xs text-muted-foreground sm:text-sm">
              BridgeForward never exposes private student data to partner
              organizations and does not duplicate the high school Pathway
              Report.
            </p>
          </div>
        </section>

        {/* Soft tinted band with the four steps + decorative corners */}
        <section className="relative mt-10 overflow-hidden rounded-3xl border bg-muted/40 p-6 shadow-soft sm:p-10">
          <Starburst className="pointer-events-none absolute -right-6 -top-6 hidden h-24 w-24 text-primary/15 sm:block" />
          <ArcStack className="pointer-events-none absolute -bottom-2 left-0 hidden h-32 w-32 -scale-x-100 text-primary/15 sm:block" />

          <div className="relative">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary sm:text-xs sm:tracking-[0.18em]">
              <Compass className="h-4 w-4" /> Four Steps · Middle School to High School
            </div>
            <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">
              A clear bridge, one step at a time
            </h2>
            <Squiggle className="mt-2 h-3 w-48 text-primary/40" />

            <CardGrid columns={2} className="mt-6">
              {STEPS.map((s) => (
                <Card key={s.title} className="h-full bg-card/90 backdrop-blur-sm">
                  <CardHeader className="flex flex-col items-center gap-2 space-y-0 p-6 text-center">
                    <s.icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm whitespace-nowrap sm:text-base">
                      {s.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 text-center text-sm text-muted-foreground">
                    {s.body}
                  </CardContent>
                </Card>
              ))}
            </CardGrid>
          </div>
        </section>
        <FaqSection title="Common Questions From Parents and Teachers" items={BRIDGE_FAQ} />
      </div>
    </SiteShell>
  );
}
