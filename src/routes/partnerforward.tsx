import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeroCTAs } from "@/components/site/HeroCTAs";
import { CardGrid } from "@/components/layout/CardGrid";
import {
  ArcStack,
  Sparkle,
  Squiggle,
  Starburst,
  DotField,
  UnderlineSwoosh,
  PaperPlane,
} from "@/components/effects/Decorations";
import {
  Handshake,
  Sparkles,
  Landmark,
  Coins,
  HeartHandshake,
  Accessibility,
  ArrowRight,
  Info,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/partnerforward")({
  head: () => ({
    meta: [
      { title: "PartnerForward — Incentives & Support for Partners" },
      {
        name: "description",
        content:
          "PartnerForward is the incentive and support layer for TransitionForward partners — tax credits, grants, sponsorships, inclusive-hiring resources, and accessibility supports.",
      },
      { property: "og:title", content: "PartnerForward — Incentives & Support" },
      {
        property: "og:description",
        content:
          "Plain-language guidance on federal, state, and philanthropic incentives that may help partners expand their reach and mission impact.",
      },
    ],
  }),
  component: PartnerForwardPage,
});

const PILLARS = [
  {
    icon: Coins,
    title: "Tax Credit & Deduction Awareness",
    body: "Plain-language overviews of federal and state programs like WOTC, the Disabled Access Credit, and the Barrier Removal Deduction — with links to authoritative sources.",
  },
  {
    icon: Landmark,
    title: "Grants & Sponsorship Opportunities",
    body: "Curated funding and sponsorship pathways that may support inclusive programming, workforce training, and community partnerships.",
  },
  {
    icon: HeartHandshake,
    title: "Inclusive Hiring & Workforce Supports",
    body: "Resources from state Bureaus of Rehabilitation Services, the U.S. DOL, and the Job Accommodation Network to help expand inclusive hiring practices.",
  },
  {
    icon: Accessibility,
    title: "Accessibility Improvement Resources",
    body: "ADA guidance, accommodation tools, and accessibility audits that help partners make programs welcoming to every learner.",
  },
  {
    icon: Sparkles,
    title: "Partner Growth Support",
    body: "Mission-aligned context on how collaborating with TransitionForward may expand a partner's reach and visibility with Connecticut families and educators.",
  },
] as const;

function PartnerForwardPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <Breadcrumbs trail={[{ label: "PartnerForward" }]} />

        {/* Hero with layered backdrop + decorations */}
        <section className="relative mt-6 overflow-hidden rounded-3xl border bg-gradient-hero p-8 shadow-soft sm:p-12">
          <ArcStack className="pointer-events-none absolute -left-4 -top-4 hidden h-32 w-32 -scale-y-100 text-primary/15 sm:block" />
          <Starburst className="pointer-events-none absolute right-10 top-10 hidden h-20 w-20 text-primary/20 sm:block" />
          <PaperPlane className="pointer-events-none absolute bottom-8 right-12 hidden h-12 w-12 text-primary/40 sm:block" />
          <DotField className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-1/3 text-primary/10 sm:block" />

          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Handshake className="h-4 w-4" /> PartnerForward · Incentives & Support
            </div>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium tracking-tight sm:text-5xl">
              Supports That Help Partners Do More of the Work That Matters.
            </h1>
            <UnderlineSwoosh className="mt-2 h-3 w-56 text-primary/40" />
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              PartnerForward is the incentive and support layer that sits
              alongside the existing Partner Network and Opportunity Directory.
              It is not a second partner directory or dashboard. Instead, it
              surfaces the federal, state, philanthropic, and workforce-development
              incentives, grants, credits, deductions, and support programs that
              may help partners expand inclusive hiring, accessibility, and
              community reach.
            </p>
            <HeroCTAs className="mt-6">
              <Button asChild size="lg">
                <Link to="/partnerforward/incentives">
                  Explore Incentives & Support
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/partners">About the Partner Network</Link>
              </Button>
            </HeroCTAs>
          </div>
        </section>

        {/* Tinted band wrapping the pillar grid */}
        <section className="relative mt-10 overflow-hidden rounded-3xl border bg-muted/40 p-6 shadow-soft sm:p-10">
          <ArcStack className="pointer-events-none absolute -left-6 -top-2 hidden h-32 w-32 text-primary/15 sm:block" />
          <Sparkle className="pointer-events-none absolute right-8 top-8 hidden h-5 w-5 text-primary/40 sm:block" />
          <Starburst className="pointer-events-none absolute -bottom-6 -right-6 hidden h-24 w-24 text-primary/15 sm:block" />

          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Users className="h-4 w-4" /> Five pillars of partner support
            </div>
            <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">
              Real Supports for Mission-Aligned Partners
            </h2>
            <Squiggle className="mt-2 h-3 w-48 text-primary/40" />

            <CardGrid columns={3} centerOddLast className="mt-6">
              {PILLARS.map((p) => (
                <Card key={p.title} className="h-full bg-card/90 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                    <p.icon className="h-5 w-5 shrink-0 text-primary" />
                    <CardTitle className="text-base leading-snug">{p.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {p.body}
                  </CardContent>
                </Card>
              ))}
            </CardGrid>
          </div>
        </section>

        {/* Disclaimer band */}
        <section className="relative mt-10 flex gap-3 overflow-hidden rounded-3xl border border-amber-400/40 bg-amber-50/60 p-5 text-sm text-amber-950 shadow-soft dark:bg-amber-950/20 dark:text-amber-100">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="relative">
            Some partners may qualify for federal, state, local, philanthropic,
            or workforce-development incentives, grants, credits, deductions,
            or support programs. TransitionForward does not provide tax,
            legal, or financial advice. Partners should review official
            guidance and consult qualified professionals before acting on any
            information shown here.
          </p>
        </section>

        <p className="mt-6 text-xs text-muted-foreground">
          PartnerForward does not duplicate the existing Partner Dashboard,
          Partner Directory, or Opportunity Directory. Those tools remain the
          home for partner profiles and opportunity submissions.
        </p>
      </div>
    </SiteShell>
  );
}
