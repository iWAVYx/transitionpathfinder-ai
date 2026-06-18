import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  HeartHandshake,
  GraduationCap,
  Building2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Briefcase,
  Landmark,
  School,
  Users,
  Star,
  Lock,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toTitleCase } from "@/lib/title-case";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — TransitionForward" },
      {
        name: "description",
        content:
          "Free for pilot families and educators. Pilot-ready pricing for schools, districts, and partner organizations. Transparent tiers, no surprise fees.",
      },
      { property: "og:title", content: "Pricing — TransitionForward" },
      {
        property: "og:description",
        content:
          "Long-term flow: district → schools → educators → students → families. Early-access paths for everyone in between.",
      },
      { property: "og:url", content: "/pricing" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: PricingPage,
});

type CtaTo = "/waitlist" | "/contact" | "/login";

interface Tier {
  id: string;
  group: "Families & students" | "Educators & schools" | "Districts" | "Partners" | "Platform";
  name: string;
  price: string;
  priceNote: string;
  description: string;
  features: string[];
  cta: { label: string; to: CtaTo; search?: Record<string, string> };
  icon: typeof HeartHandshake;
  highlight?: boolean;
}

const tiers: Tier[] = [
  {
    id: "free-waitlist",
    group: "Families & students",
    name: "Free / Waitlist",
    price: "$0",
    priceNote: "Free public site · join the waitlist for access",
    description:
      "Browse TransitionForward, BridgeForward, and PartnerForward overviews. Join the waitlist to be matched with an open cohort or school pilot.",
    features: [
      "Public program overviews",
      "Public partner & opportunity directory",
      "Waitlist with role-based review",
    ],
    cta: { label: "Join the waitlist", to: "/waitlist" },
    icon: Lock,
  },
  {
    id: "family-early-access",
    group: "Families & students",
    name: "Family Early Access",
    price: "$0",
    priceNote: "Free during the 2026 pilot",
    description:
      "Parents, caregivers, and students invited from the waitlist. Build a real transition plan and share it with your team.",
    features: [
      "Unlimited Pathway Reports for your student",
      "Plain-language intake & PPT prep",
      "30-day plans you can actually do",
      "Family-controlled privacy & sharing",
    ],
    cta: { label: "Request family access", to: "/waitlist", search: { audience: "family" } },
    icon: HeartHandshake,
    highlight: true,
  },
  {
    id: "educator-individual",
    group: "Educators & schools",
    name: "Educator Individual",
    price: "$0",
    priceNote: "Free during the 2026 pilot",
    description:
      "For individual educators and case managers without a school plan yet — manage a small caseload and try PPT prep without district approval.",
    features: [
      "Caseload of up to 25 students",
      "PPT prep + question banks",
      "Goal tracker with progress notes",
      "Family-friendly share links",
    ],
    cta: { label: "Request educator access", to: "/waitlist", search: { audience: "educator" } },
    icon: GraduationCap,
  },
  {
    id: "school-pilot",
    group: "Educators & schools",
    name: "School Pilot",
    price: "Pilot rate",
    priceNote: "Single-building cohort · 1 school year",
    description:
      "A single school running TransitionForward across its transition caseload with implementation support and weekly office hours.",
    features: [
      "Up to ~15 educators per building",
      "School Admin dashboard",
      "Onboarding, PD, and weekly office hours",
      "Pilot reporting + outcomes review",
    ],
    cta: { label: "Apply for a school pilot", to: "/waitlist", search: { audience: "school" } },
    icon: School,
  },
  {
    id: "school-plan",
    group: "Educators & schools",
    name: "School Plan",
    price: "Quoted by caseload",
    priceNote: "Billed annually · BAA + DPA on file",
    description:
      "A single school on a renewing annual plan. Unlimited educators in the building, district reporting compatible, SSO available.",
    features: [
      "Unlimited educators in the building",
      "Building-level admin dashboard",
      "SSO (Google / Microsoft)",
      "Outcomes reporting for state indicators",
    ],
    cta: { label: "Request a school quote", to: "/contact" },
    icon: School,
  },
  {
    id: "district-pilot",
    group: "Districts",
    name: "District Pilot",
    price: "Pilot rate",
    priceNote: "Multi-school cohort · 1 school year",
    description:
      "A district trialing TransitionForward across two or more schools, with district reporting and central onboarding.",
    features: [
      "Multi-school rollout with central support",
      "District + School admin dashboards",
      "Connected family / educator invites",
      "Pilot reporting + outcomes review",
    ],
    cta: { label: "Apply for a district pilot", to: "/waitlist", search: { audience: "district" } },
    icon: Landmark,
  },
  {
    id: "district-plan",
    group: "Districts",
    name: "District Plan",
    price: "Quoted by caseload",
    priceNote: "Billed annually · BAA + DPA on file",
    description:
      "Full district rollout — every building, every transition caseload. Connected families and educators are invited in automatically.",
    features: [
      "Unlimited educators & students in your district",
      "FERPA-aligned data agreement (BAA / DPA)",
      "SSO + roster sync",
      "District + building dashboards",
      "Outcomes reporting for state & federal indicators",
    ],
    cta: { label: "Request a district quote", to: "/contact" },
    icon: Building2,
    highlight: true,
  },
  {
    id: "partner-basic",
    group: "Partners",
    name: "Partner Basic",
    price: "$0",
    priceNote: "Free for approved partners",
    description:
      "Colleges, technical programs, BRS, employers, mentorship — list your opportunities and connect with students who fit.",
    features: [
      "Partner profile in the directory",
      "Post opportunities to the catalog",
      "Manage incoming connections",
    ],
    cta: { label: "Become a partner", to: "/waitlist", search: { audience: "partner" } },
    icon: Briefcase,
  },
  {
    id: "partner-featured",
    group: "Partners",
    name: "Partner Featured",
    price: "Sponsorship",
    priceNote: "Quoted per region / cohort",
    description:
      "Featured placement in PartnerForward, priority surfacing on student recommendation cards, and co-branded resources.",
    features: [
      "Featured placement & priority match",
      "Co-branded resources in the library",
      "Quarterly impact reporting",
    ],
    cta: { label: "Talk to us about featuring", to: "/contact" },
    icon: Star,
  },
  {
    id: "platform-internal",
    group: "Platform",
    name: "Platform Internal",
    price: "Internal",
    priceNote: "TransitionForward team accounts",
    description:
      "Used by the TransitionForward platform team for content review, partner approval, pilot operations, and system health. Not sold.",
    features: [
      "Admin Hub for platform operations",
      "Pilot launch + outreach tools",
      "Health checks + audit logs",
    ],
    cta: { label: "Staff sign-in", to: "/login" },
    icon: ShieldCheck,
  },
];

const groupOrder: Tier["group"][] = [
  "Families & students",
  "Educators & schools",
  "Districts",
  "Partners",
  "Platform",
];

const faqs = [
  {
    q: "How do we move from pilot to plan?",
    a: "Pilots are scoped to one school year and one cohort. At the end of the pilot, schools and districts can renew on the School Plan or District Plan with quoted, caseload-based pricing. Family and educator early-access accounts stay active through the transition.",
  },
  {
    q: "Is the pilot really free for families?",
    a: "Yes — completely free. No credit card, no trial countdown. In exchange we ask for honest feedback so we build what families actually need.",
  },
  {
    q: "What does a district plan cost?",
    a: "District pricing is based on the number of students on transition caseloads — not number of teachers, not number of buildings. We send a written quote within two business days of a request.",
  },
  {
    q: "Do you sign Data Privacy Agreements?",
    a: "Yes. We sign student data privacy agreements (including the Connecticut SDPA), a FERPA-aligned BAA, and standard insurance docs. We never sell data, never train AI models on student records.",
  },
  {
    q: "Can a parent pay for it themselves if my district isn't ready?",
    a: "Yes — Family Early Access is free today, and a low-cost individual family plan will be available after the pilot for families whose schools haven't joined yet. You'll never need a district account to use TransitionForward.",
  },
  {
    q: "Do you offer scholarships?",
    a: "Yes. If cost is ever a barrier — for a family, a teacher, or a small program — email hello@transitionforward.org. We'll figure it out together.",
  },
];

function PricingPage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-12 lg:px-8 lg:py-14">
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" /> Pilot-ready pricing
          </Badge>
          <h1 className="mt-4 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {toTitleCase("Free for families. Fair for schools. Clear for everyone.")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            We won't make families pay for transition planning, and we won't make
            districts guess what it costs. Here's the long-term flow — and every
            early-access path in between.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> FERPA-aligned · DPA ready
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
              <Check className="h-3.5 w-3.5 text-primary" /> No surprise fees
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
              <Check className="h-3.5 w-3.5 text-primary" /> Cancel any time
            </span>
          </div>
        </div>
      </section>

      {/* Long-term flow */}
      <section className="mx-auto max-w-6xl px-4 pb-2 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-primary/20 bg-card p-6 shadow-soft sm:p-8">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h2 className="font-display text-xl">{toTitleCase("How TransitionForward grows in a community")}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/85">
                Long-term, TransitionForward is rolled out by districts — and
                that's what unlocks access for connected schools, educators,
                students, and families. Early-access paths exist so people
                don't have to wait for a full rollout to start.
              </p>
              <ol className="mt-5 grid gap-3 sm:grid-cols-5">
                {[
                  { n: "1", label: "District", note: "District Plan" },
                  { n: "2", label: "Schools", note: "Building dashboards" },
                  { n: "3", label: "Educators", note: "Caseload tools" },
                  { n: "4", label: "Students", note: "Pathway & voice" },
                  { n: "5", label: "Families", note: "Plan & meeting prep" },
                ].map((s) => (
                  <li
                    key={s.n}
                    className="relative rounded-2xl border border-border/60 bg-background/80 px-3 py-3 text-center"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                      Step {s.n}
                    </p>
                    <p className="mt-1 font-display text-sm font-medium">{s.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.note}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-muted-foreground">
                Alternate early-access paths: Family Early Access, Educator
                Individual, School Pilot, District Pilot, Partner Basic / Featured.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tiers grouped */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {groupOrder.map((group) => {
          const groupTiers = tiers.filter((t) => t.group === group);
          if (!groupTiers.length) return null;
          return (
            <div key={group} className="mb-12 last:mb-0">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl tracking-tight">{toTitleCase(group)}</h2>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {groupTiers.length} tier{groupTiers.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {groupTiers.map((tier) => {
                  const Icon = tier.icon;
                  return (
                    <div
                      key={tier.id}
                      className={`relative flex flex-col rounded-3xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift ${
                        tier.highlight ? "border-primary ring-2 ring-primary/20" : ""
                      }`}
                    >
                      {tier.highlight && (
                        <Badge className="absolute -top-3 left-6">Recommended</Badge>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <h3 className="font-display text-lg">{toTitleCase(tier.name)}</h3>
                      </div>

                      <div className="mt-5">
                        <p className="font-display text-3xl tracking-tight">{tier.price}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{tier.priceNote}</p>
                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                        {tier.description}
                      </p>

                      <ul className="mt-4 space-y-2 text-sm">
                        {tier.features.map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="text-foreground/85">{f}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-6 pt-1">
                        <Button
                          asChild
                          className="w-full"
                          variant={tier.highlight ? "default" : "outline"}
                        >
                          <Link
                            to={tier.cta.to}
                            search={tier.cta.search as never}
                          >
                            {tier.cta.label} <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Promise band */}
        <div className="mt-4 rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl">{toTitleCase("Our pricing promise")}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/85">
                We will never charge a family for the core planning tools their
                student needs to leave high school with a real plan. If a feature
                ever moves from free to paid, you'll get at least 60 days' notice
                and a clear free path forward. No dark patterns. No hostage data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
          {toTitleCase("Questions families and districts ask us most")}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Don't see your question?{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">
            Ask us directly
          </Link>{" "}
          — a real person answers within two business days.
        </p>

        <dl className="mt-8 divide-y divide-border/60 rounded-3xl border bg-card shadow-soft">
          {faqs.map((faq) => (
            <div key={faq.q} className="px-6 py-5">
              <dt className="font-display text-base">{toTitleCase(faq.q)}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-foreground/85">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </SiteShell>
  );
}
