import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  HeartHandshake,
  GraduationCap,
  Building2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — TransitionForward" },
      {
        name: "description",
        content:
          "Free for pilot families and educators. Transparent, district-friendly pricing for schools and partner organizations. No surprise fees, ever.",
      },
      { property: "og:title", content: "Pricing — TransitionForward" },
      {
        property: "og:description",
        content:
          "Free for pilot families and educators. District plans quoted by caseload, billed annually, with implementation and training included.",
      },
    ],
  }),
  component: PricingPage,
});

interface Tier {
  id: string;
  eyebrow: string;
  name: string;
  price: string;
  priceNote: string;
  audience: string;
  description: string;
  features: string[];
  cta: { label: string; to: "/waitlist" | "/contact" | "/login" };
  highlight?: boolean;
  icon: typeof HeartHandshake;
}

const tiers: Tier[] = [
  {
    id: "family",
    eyebrow: "Families & students",
    name: "Family Pilot",
    price: "$0",
    priceNote: "Free during the 2026 pilot",
    audience: "Parents, caregivers, and students 14+",
    description:
      "Everything a family needs to translate an IEP into a real-life plan — at no cost while we learn from your feedback.",
    features: [
      "Unlimited Pathway Reports for your student",
      "Guided intake in plain language (no jargon)",
      "PPT/IEP meeting prep packet",
      "30-day plans you can actually do",
      "Save and share with your team",
      "Family-controlled privacy & access",
    ],
    cta: { label: "Join the pilot — it's free", to: "/waitlist" },
    icon: HeartHandshake,
    highlight: true,
  },
  {
    id: "educator",
    eyebrow: "Teachers & case managers",
    name: "Educator Pilot",
    price: "$0",
    priceNote: "Free during the 2026 pilot",
    audience: "Special educators, case managers, transition coordinators",
    description:
      "For individual educators who want better PPT prep, organized caseloads, and time back in their week.",
    features: [
      "Caseload of up to 25 students",
      "Pathway Reports drafted in minutes",
      "PPT agenda + question banks ready to print",
      "Goal tracker with progress notes",
      "Document library per student",
      "Family-friendly share links",
    ],
    cta: { label: "Try the educator workspace", to: "/waitlist" },
    icon: GraduationCap,
  },
  {
    id: "district",
    eyebrow: "Schools & districts",
    name: "School & District",
    price: "Quoted by caseload",
    priceNote: "Billed annually · Implementation + training included",
    audience: "K-12 districts, RESCs, charter networks, agencies",
    description:
      "Unlimited educators on your team, district-wide reporting, BAA & DPA on file, and a real human partner during rollout.",
    features: [
      "Unlimited educators & students within your district",
      "FERPA-aligned data agreement (BAA/DPA on file)",
      "SSO (Google / Microsoft) + roster sync",
      "Building & district admin dashboards",
      "Onboarding, PD, and office hours for your team",
      "Outcomes reporting for state & federal indicators",
    ],
    cta: { label: "Request a district quote", to: "/contact" },
    icon: Building2,
  },
];

const faqs = [
  {
    q: "Is the pilot really free for families?",
    a: "Yes — completely free. No credit card, no trial countdown. In exchange we ask for honest feedback so we build what you actually need. If we add premium features after the pilot, you'll know exactly what's free and what isn't before anything changes.",
  },
  {
    q: "What does a district plan actually cost?",
    a: "District pricing is based on the number of students on transition caseloads — not number of teachers, not number of buildings. Most Connecticut districts land between $4–$9 per student per year. Smaller pilots (one or two schools) start lower. We'll send a written quote within two business days.",
  },
  {
    q: "Will my district need a Data Privacy Agreement?",
    a: "Yes — and we have one ready. We sign student data privacy agreements (including the Connecticut SDPA), a FERPA-aligned BAA, and standard insurance docs. We never sell data, never train AI models on student records, and never share information with marketers.",
  },
  {
    q: "What happens when the pilot ends?",
    a: "Pilot families and educators keep their accounts and their data. Anything that becomes paid will be clearly labeled, and you'll get at least 60 days' notice with a free tier that stays useful — not a downgrade trap.",
  },
  {
    q: "Can a parent pay for it themselves if my district isn't ready?",
    a: "Yes. The Family Pilot is free today, and a low-cost individual family plan will be available after the pilot for families whose schools haven't joined yet. You'll never need a district account to use TransitionForward.",
  },
  {
    q: "Do you offer scholarships?",
    a: "Yes. If cost is ever a barrier — for a family, a teacher, or a small program — email hello@transitionforward.org. We'll figure it out together. No paperwork gymnastics.",
  },
];

function PricingPage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" /> Transparent pricing
          </Badge>
          <h1 className="mt-4 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Free for families. Fair for schools.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            We won't make families pay for transition planning, and we won't make
            districts guess what it costs. Here's what's free today and what
            schools can budget for tomorrow — in plain English.
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

      {/* Tiers */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-3xl border bg-card p-7 shadow-soft transition-shadow hover:shadow-lift ${
                  tier.highlight ? "border-primary ring-2 ring-primary/20" : ""
                }`}
              >
                {tier.highlight && (
                  <Badge className="absolute -top-3 left-7">Most popular</Badge>
                )}
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      {tier.eyebrow}
                    </p>
                    <h2 className="font-display text-xl">{tier.name}</h2>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="font-display text-4xl tracking-tight">{tier.price}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tier.priceNote}</p>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-foreground/85">
                  {tier.description}
                </p>
                <p className="mt-2 text-xs italic text-muted-foreground">
                  For {tier.audience}
                </p>

                <ul className="mt-5 space-y-2.5 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-foreground/85">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 pt-1">
                  <Button asChild className="w-full" variant={tier.highlight ? "default" : "outline"}>
                    <Link to={tier.cta.to}>
                      {tier.cta.label} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Promise band */}
        <div className="mt-10 rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl">Our pricing promise</h2>
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
          Questions families and districts ask us most
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Don't see your question? <Link to="/contact" className="font-medium text-primary hover:underline">Ask us directly</Link> — a real person answers within two business days.
        </p>

        <dl className="mt-8 divide-y divide-border/60 rounded-3xl border bg-card shadow-soft">
          {faqs.map((faq) => (
            <div key={faq.q} className="px-6 py-5">
              <dt className="font-display text-base">{faq.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-foreground/85">{faq.a}</dd>
            </div>
          ))}
        </dl>

        {/* Closer CTAs by persona */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Link
            to="/waitlist"
            className="group rounded-3xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Families
            </p>
            <p className="mt-2 font-display text-lg">Start a free Pathway Report</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No credit card. No district required.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Join the pilot <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
          <Link
            to="/waitlist"
            className="group rounded-3xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Educators
            </p>
            <p className="mt-2 font-display text-lg">Try the educator workspace</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bring up to 25 students. We'll set you up.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Get access <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
          <Link
            to="/contact"
            className="group rounded-3xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Districts
            </p>
            <p className="mt-2 font-display text-lg">Request a written quote</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Caseload-based pricing. DPA on file. Two-day turnaround.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Contact us <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
