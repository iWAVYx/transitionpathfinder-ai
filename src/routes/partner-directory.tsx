import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, ExternalLink, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listPublicPartners } from "@/lib/partner-network.functions";
import { TrustNote } from "@/components/site/TrustNote";

export const Route = createFileRoute("/partner-directory")({
  head: () => ({
    meta: [
      { title: "Connecticut Partner Directory — TransitionForward" },
      {
        name: "description",
        content:
          "Browse Connecticut transition partners: state agencies, employment supports, day programs, postsecondary options, and community resources for students with disabilities.",
      },
      { property: "og:title", content: "Connecticut Partner Directory — TransitionForward" },
      {
        property: "og:description",
        content:
          "A living directory of CT transition opportunities — verified partners and community resource leads.",
      },
    ],
    links: [{ rel: "canonical", href: "/partner-directory" }],
  }),
  component: PartnerDirectoryPage,
});

type Partner = {
  id: string;
  organization_name: string;
  partner_type: string;
  description: string | null;
  website_url: string | null;
  county: string | null;
  city: string | null;
  verification_status: string;
  collection_tags: string[];
  pathway_categories: string[];
  audience_served: string[];
  is_featured: boolean;
};

function statusLabel(s: string): { label: string; tone: string } {
  switch (s) {
    case "verified":
      return { label: "Verified Partner", tone: "bg-emerald-100 text-emerald-900" };
    case "featured":
      return { label: "Featured Partner", tone: "bg-primary/15 text-primary" };
    case "potential":
      return { label: "Potential Opportunity Lead", tone: "bg-amber-100 text-amber-900" };
    case "needs_review":
      return { label: "Community Resource — Needs Verification", tone: "bg-muted text-foreground" };
    default:
      return { label: s, tone: "bg-muted text-foreground" };
  }
}

const COLLECTIONS: { tag: string; label: string; blurb: string }[] = [
  { tag: "free_ct_training", label: "Free CT training", blurb: "No-cost workforce training pathways across Connecticut." },
  { tag: "youth_employment", label: "Youth employment", blurb: "Summer jobs, youth workforce, and first-job programs." },
  { tag: "adult_education", label: "Adult education", blurb: "GED, ESL, and adult learning bridges to postsecondary." },
  { tag: "workforce_boards", label: "Workforce boards", blurb: "Regional Workforce Investment Boards serving CT." },
  { tag: "manufacturing_trades", label: "Manufacturing & trades", blurb: "Manufacturing pipelines and skilled-trades training." },
  { tag: "disability_employment", label: "Disability employment", blurb: "Supported employment and disability-focused job programs." },
  { tag: "inclusive_employer_leads", label: "Inclusive employer leads", blurb: "Employers exploring inclusive hiring in CT." },
];

function PartnerDirectoryPage() {
  const fetchList = useServerFn(listPublicPartners);
  const [rows, setRows] = useState<Partner[] | null>(null);
  const [q, setQ] = useState("");
  const [county, setCounty] = useState<string>("all");
  const [pathway, setPathway] = useState<string>("all");
  const [serviceType, setServiceType] = useState<string>("all");
  const [audience, setAudience] = useState<string>("all");
  const [collection, setCollection] = useState<string>("all");

  useEffect(() => {
    fetchList()
      .then((r) => setRows(r.partners as Partner[]))
      .catch(() => setRows([]));
  }, [fetchList]);

  const counties = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.county).filter(Boolean))) as string[],
    [rows],
  );
  const pathways = useMemo(
    () => Array.from(new Set((rows ?? []).flatMap((r) => r.pathway_categories ?? []))),
    [rows],
  );
  const serviceTypes = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.partner_type).filter(Boolean))) as string[],
    [rows],
  );
  const audiences = useMemo(
    () => Array.from(new Set((rows ?? []).flatMap((r) => r.audience_served ?? []))),
    [rows],
  );

  const activeCollection = COLLECTIONS.find((c) => c.tag === collection);

  const filtered = useMemo(() => {
    return (rows ?? []).filter((p) => {
      if (county !== "all" && p.county !== county) return false;
      if (pathway !== "all" && !(p.pathway_categories ?? []).includes(pathway)) return false;
      if (serviceType !== "all" && p.partner_type !== serviceType) return false;
      if (audience !== "all" && !(p.audience_served ?? []).includes(audience)) return false;
      if (collection !== "all" && !(p.collection_tags ?? []).includes(collection)) return false;
      if (q) {
        const hay =
          `${p.organization_name} ${p.description ?? ""} ${(p.collection_tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, q, county, pathway, serviceType, audience, collection]);

  const verified = filtered.filter((p) =>
    ["verified", "featured"].includes(p.verification_status),
  );
  const featured = verified.filter((p) => p.is_featured);
  const leads = filtered.filter((p) =>
    ["potential", "needs_review"].includes(p.verification_status),
  );

  return (
    <SiteShell>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Connecticut transition ecosystem
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight md:text-5xl">
            Partner Directory
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            State agencies, employment programs, day programs, postsecondary options, and inclusive
            employer leads — verified partners and community resources for transition planning across
            Connecticut.
          </p>
          <TrustNote variant="partners" className="mt-5 max-w-3xl" />

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search organizations, services, tags…"
                className="pl-9"
              />
            </div>
            <select
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All counties</option>
              {counties.sort().map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={pathway}
              onChange={(e) => setPathway(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All pathways</option>
              {pathways.sort().map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              aria-label="Service type"
            >
              <option value="all">All service types</option>
              {serviceTypes.sort().map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              aria-label="Age or grade fit"
            >
              <option value="all">All ages / grades</option>
              {audiences.sort().map((a) => (
                <option key={a} value={a}>
                  {a.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCollection("all")}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                collection === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
            >
              All collections
            </button>
            {COLLECTIONS.map((c) => (
              <button
                key={c.tag}
                type="button"
                onClick={() => setCollection(c.tag)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  collection === c.tag
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Link to="/partners" className="underline-offset-4 hover:underline">
              Become a partner →
            </Link>
            <span aria-hidden>·</span>
            <Link to="/contact" className="underline-offset-4 hover:underline">
              Suggest an organization →
            </Link>
          </div>
        </div>
      </section>

      {activeCollection && (
        <div className="border-b border-border bg-primary/5">
          <div className="mx-auto max-w-6xl px-6 py-3 text-sm text-foreground">
            <span className="font-medium">{activeCollection.label}:</span>{" "}
            <span className="text-muted-foreground">{activeCollection.blurb}</span>
          </div>
        </div>
      )}


      <main className="mx-auto max-w-6xl px-6 py-10">
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Loading directory…</p>
        ) : (
          <>
            {featured.length > 0 && (
              <Section
                icon={<Sparkles className="h-4 w-4" />}
                title="Featured partners"
                rows={featured}
              />
            )}
            <Section
              icon={<ShieldCheck className="h-4 w-4" />}
              title={`Verified partners (${verified.length})`}
              rows={verified}
            />
            {leads.length > 0 && (
              <Section
                icon={<AlertCircle className="h-4 w-4" />}
                title={`Community resources & leads (${leads.length})`}
                description="Public information gathered from CT sources. Always verify directly before relying on services."
                rows={leads}
              />
            )}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">No partners match those filters.</p>
            )}
          </>
        )}
        <p className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          This directory is informational. TransitionForward does not guarantee availability, cost,
          or eligibility for any listed organization. Confirm details directly with the provider.
        </p>
      </main>
    </SiteShell>
  );
}

function Section({
  icon,
  title,
  description,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  rows: Partner[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 className="font-display text-xl font-medium">{title}</h2>
      </div>
      {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => (
          <PartnerCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

function PartnerCard({ p }: { p: Partner }) {
  const status = statusLabel(p.verification_status);
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 font-medium leading-snug">{p.organization_name}</h3>
        <Badge
          className={`${status.tone} hover:${status.tone} max-w-full whitespace-normal text-left text-[10px] sm:shrink-0`}
        >
          {status.label}
        </Badge>
      </div>
      {(p.city || p.county) && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {[p.city, p.county && `${p.county} County`].filter(Boolean).join(" · ")}
        </p>
      )}
      {p.description && (
        <p className="text-sm text-muted-foreground line-clamp-4">{p.description}</p>
      )}
      <div className="flex flex-wrap gap-1">
        {(p.pathway_categories ?? []).slice(0, 4).map((t) => (
          <span
            key={t}
            className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
          >
            {t}
          </span>
        ))}
      </div>
      {p.website_url && (
        <a
          href={p.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Visit website <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </Card>
  );
}
