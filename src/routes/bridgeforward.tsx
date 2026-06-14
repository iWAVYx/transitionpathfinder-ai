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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getProgramEligibility } from "@/lib/bridgeforward.functions";
import { HeroCTAs } from "@/components/site/HeroCTAs";
import { CardGrid } from "@/components/layout/CardGrid";

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

        <section className="mt-6 rounded-3xl border bg-gradient-hero p-8 shadow-soft sm:p-12">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <GraduationCap className="h-4 w-4" /> Grades 6–8 · Middle School
          </div>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium tracking-tight sm:text-5xl">
            BridgeForward
          </h1>
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
                <Button asChild size="lg">
                  <Link to="/bridgeforward/intake">
                    Open BridgeForward Tools
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
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
        </section>

        <CardGrid columns={2} className="mt-8">
          {STEPS.map((s) => (
            <Card key={s.title} className="h-full">
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

        <section className="mt-10 rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <h2 className="font-display text-2xl font-medium tracking-tight">
            Who BridgeForward is for
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Students in grades 6, 7, and 8</li>
            <li>Parents and guardians of a middle-school student</li>
            <li>Educators and case managers supporting middle-school teams</li>
            <li>School and district administrators with middle-school students in their care</li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            BridgeForward never exposes private student data to partner
            organizations and does not duplicate the high school Pathway
            Report.
          </p>
        </section>
      </div>
    </SiteShell>
  );
}
