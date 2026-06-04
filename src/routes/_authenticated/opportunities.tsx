import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  GraduationCap,
  Wrench,
  Briefcase,
  HeartHandshake,
  Bus,
  Users,
  ExternalLink,
  MapPin,
  Sparkles,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { toTitleCase } from "@/lib/title-case";
import {
  listApprovedOpportunities,
  type PublicOpportunity,
} from "@/lib/partner-workspace.functions";
export const Route = createFileRoute("/_authenticated/opportunities")({
  head: () => ({
    meta: [{ title: "Opportunities — TransitionForward" }],
  }),
  component: OpportunitiesPage,
});

type Category =
  | "college"
  | "technical"
  | "employment"
  | "agency"
  | "transportation"
  | "mentorship";

type Opportunity = {
  id: string;
  name: string;
  category: Category;
  city: string;
  description: string;
  fit: string;
  link: string;
};

const CATALOG: Opportunity[] = [
  {
    id: "uconn-beyond",
    name: "UConn Beyond Access",
    category: "college",
    city: "Storrs, CT",
    description:
      "Disability services and academic accommodations for students with IEPs entering UConn.",
    fit: "Best for: students aiming at a 4-year college with accommodations.",
    link: "https://csd.uconn.edu/",
  },
  {
    id: "manchester-cc",
    name: "Manchester Community College — STRIVE",
    category: "college",
    city: "Manchester, CT",
    description:
      "Inclusive college experience for students with intellectual disability ages 18–25.",
    fit: "Best for: students wanting a traditional campus experience with extra support.",
    link: "https://manchestercc.edu/",
  },
  {
    id: "ct-technical",
    name: "CT Technical Education and Career System",
    category: "technical",
    city: "Statewide",
    description:
      "Hands-on technical high schools with trades from culinary to information systems.",
    fit: "Best for: students who learn by doing and want a paid trade after graduation.",
    link: "https://www.cttech.org/",
  },
  {
    id: "goodwin-trades",
    name: "Goodwin University — Trades Programs",
    category: "technical",
    city: "East Hartford, CT",
    description: "Short-cycle credentials in manufacturing, healthcare, and supply chain.",
    fit: "Best for: students who want a credential in under 18 months.",
    link: "https://www.goodwin.edu/",
  },
  {
    id: "brs",
    name: "Bureau of Rehabilitation Services (BRS)",
    category: "agency",
    city: "Statewide",
    description:
      "State agency that helps adults with disabilities prepare for, get, and keep a job.",
    fit: "Open a case in 11th grade to unlock supports the day after graduation.",
    link: "https://portal.ct.gov/aging-and-disability/content-pages/bureaus/bureau-of-rehabilitation-services",
  },
  {
    id: "dds",
    name: "Department of Developmental Services (DDS)",
    category: "agency",
    city: "Statewide",
    description:
      "Day, employment, and residential supports for individuals with intellectual disability.",
    fit: "Apply early — eligibility paperwork can take months.",
    link: "https://portal.ct.gov/dds",
  },
  {
    id: "marrakech",
    name: "Marrakech — Supported Employment",
    category: "employment",
    city: "New Haven, CT",
    description: "Job coaching, customized employment, and internship pipelines across CT.",
    fit: "Best for: students who want a paid job with on-site coaching.",
    link: "https://marrakechinc.org/",
  },
  {
    id: "easterseals",
    name: "Easterseals CT — Workforce",
    category: "employment",
    city: "Hartford, CT",
    description: "Career exploration, internships, and adult skills classes.",
    fit: "Best for: 11th–12th graders piloting career interests.",
    link: "https://www.easterseals.com/ct/",
  },
  {
    id: "kennedy-center",
    name: "The Kennedy Collective",
    category: "mentorship",
    city: "Trumbull, CT",
    description: "Mentorship + day programs blending community life and work readiness.",
    fit: "Best for: young adults building independence in a supported setting.",
    link: "https://www.kennedycollective.org/",
  },
  {
    id: "cttransit",
    name: "CTtransit Travel Training",
    category: "transportation",
    city: "Statewide",
    description: "Free 1-on-1 instruction on riding the bus safely and independently.",
    fit: "Best for: students preparing to commute to school, work, or community.",
    link: "https://www.cttransit.com/",
  },
  {
    id: "ada-paratransit",
    name: "ADA Paratransit",
    category: "transportation",
    city: "Statewide",
    description:
      "Door-to-door curb-to-curb service for riders whose disability prevents fixed-route bus use.",
    fit: "Apply 90 days before need — eligibility involves an in-person assessment.",
    link: "https://www.cttransit.com/services/ada-services",
  },
  {
    id: "pati",
    name: "CT Parent Advocacy Center (CPAC)",
    category: "mentorship",
    city: "Niantic, CT",
    description: "Parent-to-parent mentorship for navigating IEPs, PPTs, and transition.",
    fit: "Best for: families who want a peer who's already walked this road.",
    link: "https://cpacinc.org/",
  },
];

const CATEGORIES: { key: Category | "all"; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <Search className="h-4 w-4" /> },
  { key: "college", label: "College", icon: <GraduationCap className="h-4 w-4" /> },
  { key: "technical", label: "Technical", icon: <Wrench className="h-4 w-4" /> },
  { key: "employment", label: "Employment", icon: <Briefcase className="h-4 w-4" /> },
  { key: "agency", label: "Agencies", icon: <HeartHandshake className="h-4 w-4" /> },
  { key: "transportation", label: "Transportation", icon: <Bus className="h-4 w-4" /> },
  { key: "mentorship", label: "Mentorship", icon: <Users className="h-4 w-4" /> },
];

function OpportunitiesPage() {
  const [active, setActive] = useState<Category | "all">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return CATALOG.filter((o) => {
      if (active !== "all" && o.category !== active) return false;
      if (q && !`${o.name} ${o.description} ${o.city}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [active, q]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Opportunities" }]}
        />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Real options, vetted for Connecticut
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">
            Opportunities & Partner Programs
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            A curated starting point of colleges, technical programs, employers, state agencies,
            transportation supports, and mentorship organizations. Tell us what's missing — we're
            adding partners every month.
          </p>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, city, or topic…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setActive(c.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active === c.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {c.icon}
              {c.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filtered.map((o) => (
            <article
              key={o.id}
              className="flex flex-col rounded-2xl border bg-card p-5 shadow-soft transition-all hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {CATEGORIES.find((c) => c.key === o.category)?.label}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-medium">{toTitleCase(o.name)}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {o.city}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{o.description}</p>
              <p className="mt-2 text-xs italic text-foreground/70">{o.fit}</p>
              <div className="mt-4 flex justify-end">
                <Button asChild size="sm" variant="outline">
                  <a href={o.link} target="_blank" rel="noopener noreferrer">
                    Visit site <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            No matches — try a different search or category.
          </p>
        )}

        <p className="mt-10 rounded-2xl border bg-muted/40 p-4 text-xs text-muted-foreground">
          Listings are informational and not endorsements. Always confirm eligibility, cost, and fit
          directly with each organization before enrolling.
        </p>
      </section>
    </SiteShell>
  );
}
