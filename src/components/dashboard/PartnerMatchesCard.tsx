import { Handshake, Sparkles, ArrowRight, MapPin, Users, Star } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toTitleCase } from "@/lib/title-case";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";


/**
 * PartnerMatchesCard — anonymized student matches for a partner
 * opportunity. Never renders PII — only pathway, grade band, interest area,
 * availability, and a fit score derived from the Pathway Report.
 */

export interface PartnerMatchItem {
  code: string;
  gradeBand: string;
  pathway: string;
  interest: string;
  availability: string;
  distance?: string;
  fit: number;
  strengths?: string[];
}

export interface PartnerMatchesData {
  opportunityTitle?: string;
  seats?: string;
  items?: PartnerMatchItem[];
  opportunitiesHref?: string;
}

const SAMPLE: Required<PartnerMatchesData> = {
  opportunityTitle: "Design + Fabrication Internship · Spring Cohort",
  seats: "3 of 5 seats matched",
  opportunitiesHref: "/opportunities",
  items: [
    { code: "TF-1042", gradeBand: "Grade 12", pathway: "College + Work", interest: "Design / CAD", availability: "Tue / Thu · Afternoons", distance: "6 mi", fit: 94, strengths: ["Portfolio ready", "Travel-trained"] },
    { code: "TF-0987", gradeBand: "Grade 11", pathway: "Work-based Learning", interest: "Fabrication", availability: "M/W/F · Mornings", distance: "3 mi", fit: 88, strengths: ["Shop safety cert.", "Team collaborator"] },
    { code: "TF-1108", gradeBand: "Grade 12", pathway: "Bridge Program", interest: "Visual Arts", availability: "Wed all day", distance: "11 mi", fit: 82, strengths: ["Consistent attendance"] },
    { code: "TF-1155", gradeBand: "Grade 11", pathway: "College + Work", interest: "3D Modeling", availability: "Th / F · Afternoons", distance: "8 mi", fit: 79, strengths: ["Strong math", "Job-coached"] },
    { code: "TF-1189", gradeBand: "Grade 12", pathway: "Direct-to-Work", interest: "Prototyping", availability: "Flexible", distance: "14 mi", fit: 74, strengths: ["Certified in tools"] },
  ],
};

function fitTone(fit: number) {
  if (fit >= 90) return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300";
  if (fit >= 80) return "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300";
  return "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300";
}

export function PartnerMatchesCard({
  data,
  isSample = true,
  empty = false,
}: {
  data?: PartnerMatchesData;
  isSample?: boolean;
  /** Force the unified empty state (no sample fallback). */
  empty?: boolean;
}) {
  const d: Required<PartnerMatchesData> = { ...SAMPLE, ...(data ?? {}), items: data?.items ?? SAMPLE.items };
  const isEmpty = empty || d.items.length === 0;


  return (
    <section
      aria-labelledby="partner-matches-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="partner-matches-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow flex items-center gap-1">
            <Handshake className="h-3 w-3" aria-hidden /> Partner Matches
          </p>
          <h2 id="partner-matches-title" className="mt-1 font-display text-2xl font-medium tracking-tight">
            {toTitleCase(d.opportunityTitle)}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Anonymized matches ranked by Pathway Report fit. Student identities are only revealed after the family consents.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSample && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample Preview
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
            <Users className="h-3 w-3" aria-hidden /> {d.seats}
          </span>
          <Link
            to={d.opportunitiesHref}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:border-primary hover:bg-primary/10"
          >
            Manage Opportunity <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      {isEmpty ? (
        <ModuleEmptyState
          kind="students"
          eyebrow="Partner Matches"
          title="No Matches Yet For This Opportunity"
          description="Post an opportunity — anonymized fit-ranked matches (pathway, grade band, availability, distance) will surface here so you can plan cohort size before family consent."
          primaryAction={{ label: "Post An Opportunity", to: d.opportunitiesHref }}
          secondaryAction={{ label: "Open Partner Report", to: "/partners-manage/impact" }}
          className="mt-5"
        />
      ) : (
      <>
      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {d.items.map((m) => (
          <li key={m.code} className="flex flex-col gap-3 rounded-2xl border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.code}</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {m.gradeBand} · {m.pathway}
                </p>
                <p className="text-xs text-foreground/80">{m.interest}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${fitTone(m.fit)}`}>
                <Star className="h-3 w-3" aria-hidden /> {m.fit}
              </span>
            </div>
            <div className="grid gap-1.5 text-[11px] text-muted-foreground">
              <p>Available: <span className="text-foreground/80">{m.availability}</span></p>
              {m.distance && (
                <p className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden /> {m.distance} from site
                </p>
              )}
            </div>
            {m.strengths && m.strengths.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {m.strengths.map((s) => (
                  <li key={s} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/20">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-5 text-[11px] italic leading-relaxed text-muted-foreground">
        Partners never see student PII. Match codes anonymize each candidate until the case manager releases identity with family consent.
      </p>
      </>
      )}

    </section>
  );
}
