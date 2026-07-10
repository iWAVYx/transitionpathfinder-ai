import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Users, ClipboardList, FileText } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_ROLES, DEMO_ROLE_ORDER, SHARED_DEMO_STUDENT } from "@/lib/demo/role-previews";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo — Preview TransitionForward by role" },
      {
        name: "description",
        content:
          "Preview TransitionForward by role: see what a student, family, educator, school admin, district admin, or partner would experience. Sample data only.",
      },
      { property: "og:title", content: "Demo — Preview TransitionForward by role" },
      {
        property: "og:description",
        content:
          "Explore a role-based preview of TransitionForward: student, family, educator, school, district, and partner. All sample data.",
      },
      { property: "og:url", content: "/demo" },
    ],
    links: [{ rel: "canonical", href: "/demo" }],
  }),
  component: DemoHub,
});

function DemoHub() {
  return (
    <SiteShell>
      <div className="container max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 space-y-14">
        {/* HERO */}
        <section className="rounded-3xl border-2 border-dashed border-primary/30 bg-gradient-hero p-6 shadow-soft sm:p-10">
          <Badge variant="outline" className="border-primary text-primary">
            <Sparkles className="mr-1 h-3 w-3" /> Sample data only
          </Badge>
          <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
            One transition plan. Every role, one shared story.
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            TransitionForward turns student voice, family priorities, educator insight, and
            IEP evidence into a single Pathway Report — the shareable deliverable your team
            brings to the next PPT. Walk the nine-stage Workspace Tour, or preview a role
            dashboard below.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to="/demo/workspace/$stage" params={{ stage: "start" }}>
                Walk The Workspace Tour <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link
                to="/demo/workspace/$stage"
                params={{ stage: "roadmap" }}
                search={{ expand: true }}
              >
                Read The Pathway Report
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/waitlist">Join The Waitlist</Link>
            </Button>
          </div>

        </section>

        {/* ROLE GRID */}
        <section>
          <div className="mb-4 flex items-baseline gap-3">
            <span className="font-mono text-xs font-semibold tracking-widest text-primary">01</span>
            <div className="h-px flex-1 bg-border" />
            <h2 className="font-display text-xl">Choose a role to preview</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_ROLE_ORDER.map((id) => {
              const role = DEMO_ROLES[id];
              const Icon = role.icon;
              return (
                <Link
                  key={id}
                  to={role.path}
                  className="group rounded-3xl border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-elegant"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <h3 className="mt-4 font-display text-xl">{role.label}</h3>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
                    {role.tagline}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{role.intro}</p>
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Platform Owner / Admin isn't shown here — it's internal operations, not a
            customer-facing role. Signed-in admins can visit{" "}
            <Link to="/owner/demo" className="underline">Admin Hub → Demo Mode</Link>.
          </p>
        </section>

        {/* SHARED STUDENT CALLOUT */}
        <section className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="mb-4 flex items-baseline gap-3">
            <span className="font-mono text-xs font-semibold tracking-widest text-primary">02</span>
            <div className="h-px flex-1 bg-border" />
            <h2 className="font-display text-xl">Follow one student across three roles</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-muted-foreground">
                Student, Family, and Educator previews share one fictional student — {" "}
                <strong>{SHARED_DEMO_STUDENT.name}</strong>, {SHARED_DEMO_STUDENT.pronouns},
                Grade {SHARED_DEMO_STUDENT.grade} at {SHARED_DEMO_STUDENT.school}. Walk through
                intake, student voice, family priorities, educator input, the Pathway Report,
                and 30 / 60 / 90 next steps to see how the three roles contribute to the same
                plan.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/demo/workspace/$stage" params={{ stage: "start" }}>
                    <ClipboardList className="mr-1.5 h-4 w-4" /> Walk the Workspace tour
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/demo/report">
                    <FileText className="mr-1.5 h-4 w-4" /> Read the Pathway Report
                  </Link>
                </Button>
              </div>
            </div>
            <blockquote className="rounded-2xl border-l-4 border-primary/40 bg-background/70 p-4 text-sm italic text-foreground/80">
              "{SHARED_DEMO_STUDENT.quote}"
              <span className="mt-2 block text-xs not-italic text-muted-foreground">
                — {SHARED_DEMO_STUDENT.name.split(" ")[0]}, in their own words
              </span>
            </blockquote>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section>
          <div className="mb-4 flex items-baseline gap-3">
            <span className="font-mono text-xs font-semibold tracking-widest text-primary">03</span>
            <div className="h-px flex-1 bg-border" />
            <h2 className="font-display text-xl">How the platform layers fit together</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <LayerCard
              index="A"
              title="Dashboard"
              body="An overview / command center — status, next actions, alerts, shortcuts."
            />
            <LayerCard
              index="B"
              title="Transition Workspace"
              body="A guided planning experience where inputs become insights and a pathway."
            />
            <LayerCard
              index="C"
              title="Pathway Report"
              body="The synthesized, shareable deliverable from the planning process."
            />
          </div>
        </section>

        {/* CLOSING CTA */}
        <section className="rounded-3xl border bg-gradient-hero p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">See enough to take the next step?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Families, educators, schools, districts, and partners are all onboarding through
                waitlists and pilots. Tell us where you fit.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link to="/waitlist">
                  Join the waitlist <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/contact">
                  <Users className="mr-1.5 h-4 w-4" /> Talk with our team
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/partner-interest">Partner interest</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}

function LayerCard({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
        {index}
      </span>
      <h3 className="mt-3 font-display text-lg">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
