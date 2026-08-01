import { createFileRoute, Link } from "@tanstack/react-router";
import {
  HeartHandshake,
  GraduationCap,
  School,
  Landmark,
  Briefcase,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { CardGrid } from "@/components/layout/CardGrid";
import { SiteShell } from "@/components/site/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/billing/StripeEmbeddedCheckout";
import { useAuth } from "@/hooks/use-auth";
import { PLANS, TRIAL_PERIOD_DAYS } from "@/lib/billing/plans";
import { isPaymentsConfigured } from "@/lib/stripe";
import { SALES_EMAIL, mailtoHref } from "@/lib/contact";
import { toTitleCase } from "@/lib/title-case";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — TransitionForward" },
      {
        name: "description",
        content:
          "Simple pricing for families, educators, schools, districts, and partners. Affordable family access, transparent pilot rates, and quoted plans.",
      },
      { property: "og:title", content: "Pricing — TransitionForward" },
      {
        property: "og:description",
        content:
          "Five clear paths into TransitionForward — families, educators, schools, districts, and partners.",
      },
      { property: "og:url", content: "/pricing" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: PricingPage,
});

type CtaTo = "/waitlist" | "/contact";

type BillingPeriod = "monthly" | "yearly";

interface TierPrice {
  monthly: string;
  yearly: string;
  note: {
    monthly: string;
    yearly: string;
  };
}

interface Tier {
  id: string;
  name: string;
  price: TierPrice;
  description: string;
  highlights: string[];
  cta: { label: string; to: CtaTo; search?: Record<string, string> };
  /**
   * Self-serve plans: signed-in visitors check out here instead of being
   * sent to the waitlist.
   */
  checkoutPriceIds?: Record<BillingPeriod, string>;
  icon: typeof HeartHandshake;
}

const tiers: Tier[] = [
  {
    id: "family",
    name: "Students & Families",
    price: {
      monthly: "$19.99",
      yearly: "$99",
      note: {
        monthly: "Per Month · Per Family",
        yearly: "Per Year · Per Family · Best Value",
      },
    },
    description:
      "Personalized Pathway Report, resource recommendations, meeting prep, and a calendar — built for parents, guardians, and students.",
    highlights: ["Pathway Report", "Meeting prep", "Family dashboard"],
    cta: { label: "Request family access", to: "/waitlist", search: { audience: "family" } },
    checkoutPriceIds: {
      monthly: PLANS.family.monthlyPriceId,
      yearly: PLANS.family.yearlyPriceId,
    },
    icon: HeartHandshake,
  },
  {
    id: "educator",
    name: "Educators & Case Managers",
    price: {
      monthly: "$29.99",
      yearly: "$199",
      note: {
        monthly: "Per Month · Per Caseload",
        yearly: "Per Year · Per Caseload · Best Value",
      },
    },
    description:
      "For individual educators and case managers supporting a transition caseload — without waiting for a school or district plan.",
    highlights: ["Caseload tools", "PPT prep", "Goal tracker"],
    cta: { label: "Request educator access", to: "/waitlist", search: { audience: "educator" } },
    checkoutPriceIds: {
      monthly: PLANS.educator.monthlyPriceId,
      yearly: PLANS.educator.yearlyPriceId,
    },
    icon: GraduationCap,
  },
  {
    id: "school",
    name: "Schools",
    price: {
      monthly: "$499",
      yearly: "$2,999",
      note: {
        monthly: "Per Month · Annual Commitment",
        yearly: "Per Year · Full School Access · Best Value",
      },
    },
    description:
      "A single school running TransitionForward across its transition team — with onboarding and pilot reporting included.",
    highlights: ["Staff access", "Student profiles", "School admin dashboard"],
    cta: { label: "Apply for a school pilot", to: "/waitlist", search: { audience: "school" } },
    icon: School,
  },
  {
    id: "district",
    name: "Districts",
    price: {
      monthly: "Quote",
      yearly: "Quote",
      note: { monthly: "Tiered by Schools, Staff, or Students", yearly: "Tiered by Schools, Staff, or Students" },
    },
    description:
      "Multi-school access with district reporting, implementation support, and connected family and educator invites.",
    highlights: ["Multi-school rollout", "District reporting", "Implementation package"],
    cta: { label: "Request a district quote", to: "/contact" },
    icon: Landmark,
  },
  {
    id: "partner",
    name: "Partner Organizations",
    price: {
      monthly: "Free",
      yearly: "Free",
      note: { monthly: "Basic Listing Free", yearly: "Basic Listing Free" },
    },
    description:
      "Colleges, employers, training programs, and community organizations — list opportunities and reach the students who fit.",
    highlights: ["Free basic listing", "Verified profile", "Featured placement"],
    cta: { label: "Become a partner", to: "/waitlist", search: { audience: "partner" } },
    icon: Briefcase,
  },
];

function BillingToggle({
  value,
  onChange,
}: {
  value: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-full border bg-muted/50 p-1"
      role="radiogroup"
      aria-label="Billing period"
    >
      {(["monthly", "yearly"] as BillingPeriod[]).map((period) => (
        <button
          key={period}
          type="button"
          role="radio"
          aria-checked={value === period}
          onClick={() => onChange(period)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            value === period
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {period === "monthly" ? "Monthly" : "Yearly"}
          {period === "yearly" && (
            <span className="ml-1.5 hidden text-[10px] font-semibold uppercase tracking-wider text-primary sm:inline">
              Save
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function PricingPage() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [checkoutPrice, setCheckoutPrice] = useState<string | null>(null);
  const { user } = useAuth();
  // Signed-in visitors buy in place; everyone else keeps the waitlist path.
  const canCheckout = Boolean(user) && isPaymentsConfigured();

  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <Badge variant="outline">Pricing</Badge>
          <h1 className="mt-4 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            {toTitleCase("Simple pricing for every part of the pathway.")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Affordable access for families. Fair, transparent options for
            educators, schools, districts, and partners.
          </p>
          <div className="mt-6 flex justify-center">
            <BillingToggle value={billing} onChange={setBilling} />
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <CardGrid columns={3} centerOddLast>
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.id}
                className="flex h-full flex-col rounded-3xl border border-border/60 bg-card p-6 shadow-soft transition-shadow hover:shadow-lift"
              >
                <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="font-display text-lg">{toTitleCase(tier.name)}</h2>
                </div>

                <div className="mt-5 flex flex-col items-center text-center sm:items-start sm:text-left">
                  <p className="font-display text-3xl tracking-tight">{tier.price[billing]}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tier.price.note[billing]}</p>

                  <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                    {tier.description}
                  </p>

                  <ul className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {tier.highlights.map((h) => (
                      <li
                        key={h}
                        className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {toTitleCase(h)}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-6">
                  {canCheckout && tier.checkoutPriceIds ? (
                    <>
                      <Button
                        className="w-full"
                        onClick={() =>
                          setCheckoutPrice(tier.checkoutPriceIds![billing])
                        }
                      >
                        {toTitleCase(
                          `Start ${TRIAL_PERIOD_DAYS}-day free trial`,
                        )}{" "}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <p className="mt-2 text-center text-xs text-muted-foreground">
                        Cancel any time before the trial ends.
                      </p>
                    </>
                  ) : (
                    <Button asChild className="w-full" variant="outline">
                      <Link to={tier.cta.to} search={tier.cta.search as never}>
                        {toTitleCase(tier.cta.label)} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardGrid>

        {/* Promise */}
        <div className="mt-10 rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl">{toTitleCase("Our pricing promise")}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/85">
                We will never let cost block a family from the core planning tools their
                student needs to leave high school with a real plan. Families included through a licensed school or district access TransitionForward at no extra cost. If cost is
                a barrier — for a family, a teacher, or a small program —
                email <a className="font-medium text-primary underline underline-offset-2" href={mailtoHref("sales")}>{SALES_EMAIL}</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
