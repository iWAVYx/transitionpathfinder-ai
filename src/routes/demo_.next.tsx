import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, ShieldCheck, Users, Building2, GraduationCap, School, Briefcase, UserCheck } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DemoStudentId } from "@/lib/demo-data";

export const Route = createFileRoute("/demo_/next")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "What Happens Next — TransitionForward Demo" },
      {
        name: "description",
        content:
          "Choose the path that fits you: family access, school pilot, district access, or partner application.",
      },
      { property: "og:title", content: "What Happens Next — TransitionForward Demo" },
      {
        property: "og:description",
        content:
          "Clear next steps for families, educators, schools, districts, and partners after the TransitionForward demo.",
      },
      { property: "og:url", content: "/demo/next" },
    ],
    links: [{ rel: "canonical", href: "/demo/next" }],
  }),
  component: DemoNextPage,
});

type Cta = {
  icon: React.ReactNode;
  audience: string;
  headline: string;
  body: string;
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
};

const CTAS: Cta[] = [
  {
    icon: <Users className="h-5 w-5" />,
    audience: "Families And Students",
    headline: "Request Family Access Or Join The Waitlist",
    body: "Family access is invite-based today. Join the waitlist and we'll reach out when your school or region is ready.",
    primary: { label: "Join The Waitlist", to: "/waitlist" },
    secondary: { label: "See Families Page", to: "/families" },
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    audience: "Educators And Case Managers",
    headline: "Bring TransitionForward To Your School",
    body: "Request a walkthrough for your team. We'll show how caseload, document review, Pathway Reports, and meeting prep fit your existing workflow.",
    primary: { label: "Request A Demo", to: "/get-started" },
    secondary: { label: "Educators Overview", to: "/educators" },
  },
  {
    icon: <School className="h-5 w-5" />,
    audience: "School Admins",
    headline: "Explore A School Pilot",
    body: "Aggregate visibility, implementation support, and predictable rollout — without exposing private student detail.",
    primary: { label: "Talk To Us About A Pilot", to: "/get-started" },
    secondary: { label: "Platform Overview", to: "/platform" },
  },
  {
    icon: <Building2 className="h-5 w-5" />,
    audience: "District Admins",
    headline: "Explore District-Level Access",
    body: "School-by-school adoption, aggregate reporting, and implementation support across your transition population.",
    primary: { label: "Contact Us", to: "/contact" },
    secondary: { label: "Platform Overview", to: "/platform" },
  },
  {
    icon: <Briefcase className="h-5 w-5" />,
    audience: "Partners",
    headline: "Apply As A Partner",
    body: "Surface your programs and opportunities to matched students. PartnerForward includes onboarding, incentives, and ongoing support.",
    primary: { label: "Apply As A Partner", to: "/partner-interest" },
    secondary: { label: "PartnerForward", to: "/partnerforward" },
  },
  {
    icon: <UserCheck className="h-5 w-5" />,
    audience: "Already Invited?",
    headline: "Create Your Account Or Sign In",
    body: "Account creation is reserved for invited or approved users. Everyone else should join the waitlist or request access above.",
    primary: { label: "Sign In", to: "/login" },
    secondary: { label: "Join The Waitlist", to: "/waitlist" },
  },
];

function DemoNextPage() {
  const { s = "maya" } = Route.useSearch() as { s?: DemoStudentId };

  return (
    <SiteShell>
      <div className="demo-shell eh-issue">
        <DemoStepBar current="next" student={s} />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Compass className="h-3 w-3" /> What's Next
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Sample Demo — No Account Created
          </Badge>
        </div>
        <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
          Pick The Path That Fits You
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Create Account is for invited or approved access. Join the waitlist if
          you're requesting access, a school pilot, a district conversation, or
          partner review.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {CTAS.map((c) => (
            <article
              key={c.audience}
              className="flex flex-col rounded-3xl border bg-card p-6 shadow-soft sm:p-7"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                {c.icon}
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {c.audience}
              </p>
              <h2 className="mt-1 font-display text-xl">{c.headline}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <Button asChild size="sm">
                  <Link to={c.primary.to}>
                    {c.primary.label} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                {c.secondary ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to={c.secondary.to}>{c.secondary.label}</Link>
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <DemoStepFooter current="next" student={s} />
      </section>
      </div>
    </SiteShell>
  );
}
