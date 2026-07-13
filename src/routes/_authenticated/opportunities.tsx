import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  ExternalLink,
  MapPin,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Star,
  Bookmark,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { OpportunityPipelineBoard } from "@/components/partner/OpportunityPipelineBoard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { toTitleCase } from "@/lib/title-case";
import { listPartnersForBrowse } from "@/lib/partner-network.functions";
import { listStudents } from "@/lib/students.functions";
import {
  matchPartnersForStudent,
  persistPartnerMatch,
  type PartnerMatch,
} from "@/lib/partner-matching.functions";
import { OpportunityLifecycleTracker } from "@/components/opportunities/OpportunityLifecycleTracker";

export const Route = createFileRoute("/_authenticated/opportunities")({
  head: () => ({ meta: [{ title: "Pathway Partner Network — TransitionForward" }] }),
  component: () => (
    <RoleGuard path="/opportunities">
      <OpportunitiesPage />
    </RoleGuard>
  ),
});

type Partner = {
  id: string;
  organization_name: string;
  partner_type: string;
  description: string | null;
  website_url: string | null;
  county: string | null;
  city: string | null;
  state: string;
  verification_status: string;
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
      return { label: "Community Resource — Verify Directly", tone: "bg-muted text-foreground" };
    default:
      return { label: s, tone: "bg-muted text-foreground" };
  }
}

function OpportunitiesPage() {
  const fetchPartners = useServerFn(listPartnersForBrowse);
  const fetchStudents = useServerFn(listStudents);
  const fetchMatches = useServerFn(matchPartnersForStudent);
  const save = useServerFn(persistPartnerMatch);

  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [students, setStudents] = useState<
    { id: string; first_name: string; last_name: string | null }[]
  >([]);
  const [studentId, setStudentId] = useState<string>("");
  const [matches, setMatches] = useState<PartnerMatch[] | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  const [q, setQ] = useState("");
  const [county, setCounty] = useState("all");
  const [pathway, setPathway] = useState("all");
  const [type, setType] = useState("all");

  useEffect(() => {
    fetchPartners()
      .then((r) => setPartners(r.partners as Partner[]))
      .catch(() => setPartners([]));
    fetchStudents()
      .then((r) =>
        setStudents(
          (r.students ?? []).map((s: { id: string; first_name: string; last_name: string | null }) => ({
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
          })),
        ),
      )
      .catch(() => setStudents([]));
  }, [fetchPartners, fetchStudents]);

  useEffect(() => {
    if (!studentId) {
      setMatches(null);
      return;
    }
    setMatchLoading(true);
    fetchMatches({ data: { student_id: studentId, limit: 18 } })
      .then((r) => setMatches(r.matches))
      .catch(() => setMatches([]))
      .finally(() => setMatchLoading(false));
  }, [studentId, fetchMatches]);

  const counties = useMemo(
    () => Array.from(new Set((partners ?? []).map((p) => p.county).filter(Boolean))) as string[],
    [partners],
  );
  const pathways = useMemo(
    () => Array.from(new Set((partners ?? []).flatMap((p) => p.pathway_categories ?? []))),
    [partners],
  );
  const types = useMemo(
    () => Array.from(new Set((partners ?? []).map((p) => p.partner_type))),
    [partners],
  );

  const filtered = useMemo(() => {
    return (partners ?? []).filter((p) => {
      if (county !== "all" && p.county !== county) return false;
      if (pathway !== "all" && !(p.pathway_categories ?? []).includes(pathway)) return false;
      if (type !== "all" && p.partner_type !== type) return false;
      if (q) {
        const hay =
          `${p.organization_name} ${p.description ?? ""} ${(p.pathway_categories ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [partners, q, county, pathway, type]);

  const handleSave = async (m: PartnerMatch) => {
    try {
      await save({
        data: {
          student_id: studentId,
          partner_id: m.partner_id,
          match_reason: m.reasons.join(" · "),
          next_step: m.suggested_next_step,
        },
      });
      toast.success("Saved to pathway");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  };

  return (
    <SiteShell>
      <div className="demo-shell">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Pathway Partner Network" }]} />
        <div className="mt-4">
          <OpportunityPipelineBoard />
        </div>
      </div>

      <section className="tf-cover mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <header>
          <p className="tf-eyebrow">
            Connecticut Transition Ecosystem
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Pathway Partner Network
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Verified partners and community-resource leads across Connecticut — colleges, technical
            programs, employment supports, day programs, advocacy, and inclusive employer leads.
            Select a student to surface personalized matches.
          </p>
        </header>

        {/* === Student matcher === */}
        {students.length > 0 && (
          <section className="mt-8 rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Recommended for
                </label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Select a student —</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name ?? ""}
                    </option>
                  ))}
                </select>
              </div>
              {studentId && (
                <p className="text-xs text-muted-foreground">
                  Matches use the student's interests, support needs, age, and transition status.
                </p>
              )}
            </div>

            {studentId && (
              <div className="mt-5">
                {matchLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating matches…
                  </p>
                ) : matches && matches.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {matches.map((m) => {
                      const status = statusLabel(m.verification_status);
                      return (
                        <article
                          key={m.partner_id}
                          className="flex flex-col gap-2 rounded-xl border bg-card p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium leading-snug">{m.organization_name}</h3>
                            <Badge className={`${status.tone} shrink-0 text-[10px]`}>
                              {status.label}
                            </Badge>
                          </div>
                          {m.reasons.length > 0 && (
                            <ul className="space-y-0.5 text-xs text-muted-foreground">
                              {m.reasons.map((r, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <Star className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                                  {r}
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="text-xs italic text-foreground/70">
                            Next step: {m.suggested_next_step}
                          </p>
                          <div className="mt-auto flex gap-2 pt-1">
                            <Button size="sm" variant="outline" onClick={() => handleSave(m)}>
                              <Bookmark className="h-3.5 w-3.5" /> Save to pathway
                            </Button>
                            {m.website_url && (
                              <Button size="sm" variant="ghost" asChild>
                                <a href={m.website_url} target="_blank" rel="noopener noreferrer">
                                  Visit <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
                    No matches scored yet for this student. Add interests, support needs, or a
                    transition status to the profile to power the matcher.
                  </p>
                )}
              </div>
            )}

            {studentId && matches && matches.length > 0 && (
              <OpportunityLifecycleTracker studentId={studentId} matches={matches} />
            )}
          </section>
        )}

        {/* === Filters + Browse === */}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search organizations, services, tags…"
              className="pl-9"
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All types</option>
            {types.sort().map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
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
        </div>

        {partners === null ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading directory…</p>
        ) : (
          <>
            <p className="mt-6 text-xs text-muted-foreground">
              Showing {filtered.length} of {partners.length} partners.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => {
                const status = statusLabel(p.verification_status);
                return (
                  <article
                    key={p.id}
                    className="flex flex-col gap-2 rounded-2xl border bg-card p-5 shadow-soft transition-all hover:shadow-lift"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium leading-snug">
                        {toTitleCase(p.organization_name)}
                      </h3>
                      <Badge className={`${status.tone} shrink-0 text-[10px]`}>
                        {status.label}
                      </Badge>
                    </div>
                    {(p.city || p.county) && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[p.city, p.county && p.county !== "Statewide" ? `${p.county} County` : p.county]
                          .filter(Boolean)
                          .join(" · ")}
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
                  </article>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <p className="mt-10 rounded-2xl border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                No partners match those filters. Try clearing them or searching by service.
              </p>
            )}
          </>
        )}

        <div className="mt-12 flex flex-wrap items-start gap-3 rounded-2xl border bg-muted/40 p-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-700" /> <span className="font-medium">Verified Partner</span>
          </div>
          <span className="opacity-50">·</span>
          <div className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> <span className="font-medium">Featured</span>
          </div>
          <span className="opacity-50">·</span>
          <div className="flex items-center gap-2 text-foreground">
            <AlertCircle className="h-4 w-4 text-amber-700" />{" "}
            <span className="font-medium">Potential / Needs Verification</span>
          </div>
          <p className="mt-2 w-full">
            Listings are provided to support transition planning and exploration. Availability,
            eligibility, and services should be confirmed directly with the organization.
          </p>
        </div>
      </section>
      </div>
    </SiteShell>
  );
}
