import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, MessageSquareQuote, Compass, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/bridgeforward")({
  head: () => ({
    meta: [
      { title: "BridgeForward — Grades 6–8 Transition" },
      {
        name: "description",
        content:
          "Help middle schoolers explore strengths, compare high school options, and feel ready for grade 9.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/bridgeforward">
      <BridgeForwardLanding />
    </RoleGuard>
  ),
});

const STEPS = [
  {
    to: "/bridgeforward/intake",
    icon: ClipboardList,
    title: "BridgeForward Profile",
    body: "Capture strengths, supports, interests, and what high school feels like right now.",
  },
  {
    to: "/bridgeforward/voice",
    icon: MessageSquareQuote,
    title: "Student Voice (Grades 6–8)",
    body: "Age-appropriate prompts so the student's words shape the plan.",
  },
  {
    to: "/bridgeforward/fit-finder",
    icon: Compass,
    title: "High School Fit Finder",
    body: "Compare neighborhood, magnet, technical, and specialized options side-by-side.",
  },
  {
    to: "/bridgeforward/snapshot",
    icon: Sparkles,
    title: "Readiness Snapshot",
    body: "Generate a versioned summary the family can bring to the next PPT.",
  },
] as const;

function BridgeForwardLanding() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs trail={[{ label: "BridgeForward" }]} />
        <div className="mt-6 rounded-3xl border bg-gradient-hero p-6 shadow-soft sm:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Grades 6–8
          </div>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            BridgeForward
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A gentle, family-friendly bridge from middle school into the right
            high school. Build a picture of who the student is today, explore
            their options, and walk into grade 9 with confidence — not
            confusion.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {STEPS.map((s) => (
            <Link key={s.to} to={s.to} className="group">
              <Card className="h-full transition hover:border-primary hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <s.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{s.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {s.body}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
