import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  Network,
  ShieldCheck,
  Sparkles,
  MapPin,
  Users2,
  Handshake,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { getMyRoles } from "@/lib/profile.functions";
import { audiencesForRoles, type RoleAudience } from "@/lib/role-policy";
import { useDemoStudent } from "@/lib/demo/use-demo-student";
import {
  useDemoSchool,
  useDemoDistrict,
  useDemoPartnerPlan,
} from "@/lib/demo/use-role-context";
import { matchOpportunitiesForProfile } from "@/lib/partner-network/matching";
import { DEMO_PARTNER_ORGS, DEMO_PARTNER_OPPORTUNITIES } from "@/lib/partner-network/demo-data";
import { Pill } from "@/components/ui/pill";

/**
 * Signed-in, role-aware Partner Network hub. This is the single entry
 * point behind the consolidated dashboard tile. Every role sees a
 * variant tuned to what they can act on:
 *  - student / family: explainable matches for the active demo profile
 *  - educator: caseload-friendly referral view
 *  - school_admin / district_admin: coverage + verification view
 *  - partner: de-identified demand signal for their own listings (no student PII)
 */
export function PartnerNetworkPage({
  audienceOverride,
  demo = false,
}: {
  audienceOverride?: RoleAudience;
  demo?: boolean;
} = {}) {
  const fetchRoles = useServerFn(getMyRoles);
  const [audience, setAudience] = useState<RoleAudience | null>(audienceOverride ?? null);
  const [loading, setLoading] = useState(!audienceOverride);

  useEffect(() => {
    if (audienceOverride) {
      setAudience(audienceOverride);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchRoles()
      .then(({ roles }) => {
        if (cancelled) return;
        const have = audiencesForRoles(roles);
        const order: RoleAudience[] = [
          "student",
          "family",
          "educator",
          "school_admin",
          "district_admin",
          "partner",
          "admin",
        ];
        setAudience(order.find((a) => have.has(a)) ?? "family");
      })
      .catch(() => {
        if (!cancelled) setAudience("family");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetchRoles, audienceOverride]);

  const body =
    loading || !audience ? (
      <div className="rounded-xl border border-border/60 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Loading your Partner Network view…
      </div>
    ) : audience === "student" ? (
      <StudentFamilyView tone="student" />
    ) : audience === "family" ? (
      <StudentFamilyView tone="family" />
    ) : audience === "educator" ? (
      <EducatorView />
    ) : audience === "school_admin" ? (
      <SchoolView />
    ) : audience === "district_admin" ? (
      <DistrictView />
    ) : audience === "partner" ? (
      <PartnerView demo={demo} />
    ) : (
      <AdminView />
    );

  const inner = (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
          <Network className="h-4 w-4" aria-hidden />
          Partner Network
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          The Right Community Partners, Matched And Explained
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Vetted programs, internships, and services from partner organizations —
          filtered by age, interests, and supports, with every match explained.
          Student data stays on your side of the network.
        </p>
      </header>
      {body}
    </main>
  );

  return demo ? inner : <SiteShell>{inner}</SiteShell>;
}


/* ---------- Student / Family ---------- */

function StudentFamilyView({ tone }: { tone: "student" | "family" }) {
  const { profile } = useDemoStudent();
  const matches = matchOpportunitiesForProfile(profile);
  const eligible = matches.filter((m) => m.eligible);
  const upcoming = matches.filter((m) => !m.eligible);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tone === "student" ? "Matches For You" : `Matches For ${profile.shortName}`}
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {eligible.length} Age-Eligible Opportunities
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Explainable Matches
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {profile.shortName} · {profile.demographics.gradeLabel} · Age {profile.demographics.age}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {eligible.map((m) => (
          <MatchCard key={m.opportunity.id} match={m} />
        ))}
      </div>

      {upcoming.length > 0 && (
        <section>
          <h3 className="mb-3 font-display text-lg font-semibold tracking-tight">
            Coming Up (Not Yet Eligible)
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {upcoming.map((m) => (
              <MatchCard key={m.opportunity.id} match={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: ReturnType<typeof matchOpportunitiesForProfile>[number] }) {
  const { opportunity: o, reasons, score, eligible, ineligibleReason } = match;
  return (
    <article className="flex h-full flex-col rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-base font-semibold tracking-tight">{o.title}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {o.orgName} · <MapPin className="mr-0.5 inline h-3 w-3" aria-hidden />
            {o.location}
          </p>
        </div>
        <Pill tone={eligible ? "success" : "muted"}>
          {eligible ? `${score}% match` : ineligibleReason ?? "Later"}
        </Pill>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{o.summary}</p>
      <ul className="mt-3 space-y-1.5 text-xs">
        {reasons.map((r, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-semibold text-foreground">{r.label}.</span>{" "}
              <span className="text-muted-foreground">{r.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          {o.applicationWindow}
        </span>
        {o.verified && (
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Verified partner
          </span>
        )}
      </div>
    </article>
  );
}

/* ---------- Educator ---------- */

function EducatorView() {
  const { profile } = useDemoStudent();
  const matches = matchOpportunitiesForProfile(profile).filter((m) => m.eligible).slice(0, 6);
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold tracking-tight">Referral-Ready Partners</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Showing matches for the active demo student — {profile.shortName}, {profile.demographics.gradeLabel}.
          Switch students from the workspace switcher to see a different caseload view.
        </p>
      </section>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {matches.map((m) => (
          <MatchCard key={m.opportunity.id} match={m} />
        ))}
      </div>
    </div>
  );
}

/* ---------- School ---------- */

function SchoolView() {
  const { school } = useDemoSchool();
  const verified = DEMO_PARTNER_ORGS.filter((o) => o.verified);
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Partner Coverage · {school.displayName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Active community partners referenced from your school's students and staff.
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <Stat label="Verified partners" value={String(verified.length)} />
          <Stat label="Open opportunities" value={String(DEMO_PARTNER_OPPORTUNITIES.length)} />
          <Stat label="Under review" value={String(DEMO_PARTNER_ORGS.length - verified.length)} />
        </dl>
      </section>
      <PartnerCoverageTable />
    </div>
  );
}

/* ---------- District ---------- */

function DistrictView() {
  const { district } = useDemoDistrict();
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          District Partner Network · {district.displayName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Verification status and referral coverage across every school in the district.
        </p>
        <dl className="mt-4 grid grid-cols-4 gap-3 text-sm">
          <Stat label="Total partners" value={String(DEMO_PARTNER_ORGS.length)} />
          <Stat label="Verified" value={String(DEMO_PARTNER_ORGS.filter((o) => o.verified).length)} />
          <Stat label="Opportunities" value={String(DEMO_PARTNER_OPPORTUNITIES.length)} />
          <Stat label="Coverage gaps" value="2" />
        </dl>
      </section>
      <PartnerCoverageTable />
    </div>
  );
}

/* ---------- Partner ---------- */

function PartnerView({ demo = false }: { demo?: boolean } = {}) {
  const { plan } = useDemoPartnerPlan();
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>De-identified only.</strong> Partners never see student names,
            IDs, or plan data. You see aggregate interest and referral signal for
            your own opportunities.
          </span>
        </p>
      </div>
      <section className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Your Listings · {plan.label}
        </h2>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <Stat label="Active opportunities" value="4" />
          <Stat label="Views (30d)" value="142" />
          <Stat label="Referrals started" value="9" />
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">
          Most-viewed audience segment this month: <strong>Grade 11 · Interests in animals and applied tech</strong>.
        </p>
        {!demo && (
          <Link
            to="/partners-manage/opportunities"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Manage My Opportunities
          </Link>
        )}
      </section>
    </div>
  );
}


/* ---------- Admin ---------- */

function AdminView() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold tracking-tight">Network Moderation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Verification queue and cross-district partner directory live in the Admin Hub.
        </p>
        <Link
          to="/admin"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Open Admin Hub
        </Link>
      </section>
      <PartnerCoverageTable />
    </div>
  );
}

/* ---------- Shared building blocks ---------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-xl font-semibold tracking-tight">{value}</dd>
    </div>
  );
}

function PartnerCoverageTable() {
  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <header className="border-b border-border/60 bg-muted/30 px-4 py-3">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
          <Users2 className="h-4 w-4 text-primary" aria-hidden /> Partner Directory
        </h3>
      </header>
      <ul className="divide-y divide-border/60">
        {DEMO_PARTNER_ORGS.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{o.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {o.kind.replaceAll("_", " ")} · {o.town}
              </p>
            </div>
            {o.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Handshake className="h-3 w-3" aria-hidden /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertCircle className="h-3 w-3" aria-hidden /> Under review
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
