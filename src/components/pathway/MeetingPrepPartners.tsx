import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, MapPin, ShieldCheck, Star, CalendarClock } from "lucide-react";
import {
  matchPartnersForStudent,
  type PartnerMatch,
} from "@/lib/partner-matching.functions";
import { Badge } from "@/components/ui/badge";

/**
 * Meeting Prep — Top Partner Contacts + Suggested Deadlines.
 * Shows the top 5 partner matches for the linked student, plus a derived
 * countdown of prep deadlines relative to the meeting date.
 */
export function MeetingPrepPartners({
  studentId,
  meetingDate,
}: {
  studentId: string | null;
  meetingDate: string | null;
}) {
  const fetchMatches = useServerFn(matchPartnersForStudent);
  const [items, setItems] = useState<PartnerMatch[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    fetchMatches({ data: { student_id: studentId, limit: 5 } })
      .then((r) => {
        if (!cancelled) setItems(r.matches);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setErrored(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, fetchMatches]);

  const deadlines = useMemo(() => computeDeadlines(meetingDate), [meetingDate]);

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-display text-lg font-medium tracking-tight">Suggested deadlines</h3>
        {deadlines.parsed ? (
          <ol className="mt-3 space-y-2">
            {deadlines.steps.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3"
              >
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.detail}</p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                  {s.when}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Add a meeting date above and we'll lay out a week-by-week prep timeline.
          </p>
        )}
      </section>

      <section>
        <h3 className="font-display text-lg font-medium tracking-tight">
          Partner contacts to have on hand
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Bring these names to the PPT — they're matched to the student's interests, county, and
          support needs.
        </p>
        {!studentId ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Link this report to a student profile to see matched partner contacts.
          </p>
        ) : items === null ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading partner matches…
          </p>
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {errored
              ? "We couldn't reach the partner network just now."
              : "No partner matches yet — add interests, transition status, or support needs to this student's profile."}
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {items.map((m) => (
              <li key={m.partner_id} className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant="outline" className="mb-1 uppercase tracking-wider">
                      {m.partner_type?.replace(/_/g, " ") || "Partner"}
                    </Badge>
                    <p className="font-display text-base leading-snug">{m.organization_name}</p>
                    {m.county && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {m.county}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {m.verification_status === "verified" && (
                      <ShieldCheck
                        className="h-4 w-4 text-emerald-600"
                        aria-label="Verified"
                      />
                    )}
                    {m.is_featured && (
                      <Star className="h-4 w-4 text-amber-500" aria-label="Featured" />
                    )}
                  </div>
                </div>
                {m.reasons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.reasons.slice(0, 2).map((why, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                      >
                        {why}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-foreground/80">
                  <span className="font-medium">Ask about:</span> {m.suggested_next_step}
                </p>
                {m.website_url && (
                  <a
                    href={m.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Visit site <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function computeDeadlines(meetingDate: string | null): {
  parsed: boolean;
  steps: { label: string; detail: string; when: string }[];
} {
  if (!meetingDate) return { parsed: false, steps: [] };
  const d = new Date(meetingDate);
  if (Number.isNaN(d.getTime())) return { parsed: false, steps: [] };
  const fmt = (offsetDays: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() - offsetDays);
    return x.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };
  return {
    parsed: true,
    steps: [
      {
        label: "Request records & draft documents",
        detail: "Ask the school for the proposed IEP draft, evaluations, and progress reports.",
        when: `${fmt(14)} · 2 wks before`,
      },
      {
        label: "Contact partner organizations",
        detail: "Reach out to the top partner contacts below to confirm services, eligibility, and availability.",
        when: `${fmt(7)} · 1 wk before`,
      },
      {
        label: "Review with the student",
        detail: "Walk through goals, concerns, and what they want to say in their own words.",
        when: `${fmt(3)} · 3 days before`,
      },
      {
        label: "Pack the meeting folder",
        detail: "Print the agenda, questions, evidence list, and partner contacts. Confirm time and location.",
        when: `${fmt(1)} · day before`,
      },
    ],
  };
}
