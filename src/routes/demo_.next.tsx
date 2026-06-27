import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Users, Building2, GraduationCap, School, Briefcase, UserCheck } from "lucide-react";

import { validateStudentSearch } from "@/components/site/DemoStepBar";
import { Button } from "@/components/ui/button";
import type { DemoStudentId } from "@/lib/demo-data";
import {
  PublicationCallout,
import { StudioPage } from "@/studio/StudioPage";
} from "@/components/publication/PublicationPage";
export const Route = createFileRoute("/demo_/next")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "What Happens Next — TransitionForward Demo" },
      { name: "description", content: "Choose the path that fits you: family access, school pilot, district access, or partner application." },
      { property: "og:title", content: "What Happens Next — TransitionForward Demo" },
      { property: "og:description", content: "Clear next steps for families, educators, schools, districts, and partners after the TransitionForward demo." },
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
    <StudioPage stage="next" student={s} preserveStudent={!!search.s} title={"What Comes Next"} dek={"Clear paths for families, educators, schools, districts, and partners — pick a starting point and we'll walk it with you."}>
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">

            <PublicationCallout kind="next">
              Create Account is for invited or approved access. Join the waitlist if you're requesting access,
              a school pilot, a district conversation, or partner review.
            </PublicationCallout>

            {/* CTA rows */}
            <div className="mt-8">
              {CTAS.map((c) => (
                <article key={c.audience} className="border-b border-[color:var(--pub-rule-soft)] py-6 last:border-b-0">
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {c.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                        {c.audience}
                      </p>
                      <h2 className="mt-1 font-[\'Instrument_Serif\',Georgia,serif] text-xl leading-snug text-foreground">
                        {c.headline}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button asChild size="sm">
                          <Link to={c.primary.to}>
                            {c.primary.label} <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        {c.secondary && (
                          <Button asChild size="sm" variant="outline">
                            <Link to={c.secondary.to}>{c.secondary.label}</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </StudioPage>
  );
}
