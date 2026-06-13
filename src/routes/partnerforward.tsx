import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Handshake, Sparkles, ListChecks, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/partnerforward")({
  head: () => ({
    meta: [
      { title: "PartnerForward — Expand Your Reach in Transition Programs" },
      {
        name: "description",
        content:
          "Join PartnerForward to connect with Connecticut families and educators planning transition. List opportunities, track impact, and explore incentive resources.",
      },
      { property: "og:title", content: "PartnerForward — TransitionForward" },
      {
        property: "og:description",
        content:
          "Partner with families and educators planning transition. List opportunities, track impact, explore incentive resources.",
      },
    ],
  }),
  component: PartnerForwardPage,
});

function PartnerForwardPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <Breadcrumbs trail={[{ label: "PartnerForward" }]} />

        <section className="mt-6 rounded-3xl border bg-gradient-hero p-8 shadow-soft sm:p-12">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Handshake className="h-4 w-4" /> PartnerForward
          </div>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Expand Your Reach. Support Real Outcomes.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            PartnerForward connects employers, colleges, technical schools,
            agencies, and community programs with the Connecticut families and
            educators who need them most. List your opportunities, show the
            difference you make, and explore federal and state incentives that
            may help offset the cost of inclusive hiring and training.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/partner-interest">
              <Button size="lg">
                Become a Partner <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/partnerforward/incentives">
              <Button variant="outline" size="lg">
                Explore Incentive Resources
              </Button>
            </Link>
          </div>
        </section>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <ListChecks className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">List Opportunities</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Post internships, tours, mentorships, and programs. Families and
              educators discover them inside their transition plans.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Track Your Impact</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Log workshops, tours, and referrals — see the real reach of your
              programs across the Connecticut transition community.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Handshake className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Incentive Hub</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Cautious, plain-language summaries of federal and state
              incentives — with direct links to the authoritative agencies.
            </CardContent>
          </Card>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          PartnerForward never shares private student records with partners.
          You see only the opportunities you publish and the impact you log.
        </p>
      </div>
    </SiteShell>
  );
}
