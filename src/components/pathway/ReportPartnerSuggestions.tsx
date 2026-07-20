import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, MapPin, ShieldCheck, Star, AlertTriangle } from "lucide-react";
import {
  matchPartnersForStudent,
  type PartnerMatch,
} from "@/lib/partner-matching.functions";
import { confidenceBandLabel } from "@/lib/partner-match-explanation";

/**
 * Renders a dynamic Partner Suggestions section inside the Pathway Report.
 * Reads live partner matches (not baked into the AI report content) so the
 * suggestions reflect the current partner network state.
 *
 * No-ops when studentId is missing (e.g. unlinked report or share view).
 */
export function ReportPartnerSuggestions({ studentId }: { studentId?: string }) {
  const fetchMatches = useServerFn(matchPartnersForStudent);
  const [items, setItems] = useState<PartnerMatch[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    fetchMatches({ data: { student_id: studentId, limit: 6 } })
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

  if (!studentId) {
    return (
      <p className="text-sm text-muted-foreground">
        Link this report to a student profile to see partner organizations matched to their
        interests, county, and support needs.
      </p>
    );
  }

  if (items === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Finding partner matches…
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {errored
          ? "We couldn't reach the partner network just now. Try refreshing in a moment."
          : "No partner matches yet — add interests, transition status, or support needs to this student's profile to unlock suggestions."}
      </p>
    );
  }

  return (
    <div>
      {items.map((m) => (
        <div
          key={m.partner_id}
          className="border-b border-[color:var(--pub-rule-soft)] py-4 last:border-b-0"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                {m.partner_type?.replace(/_/g, " ") || "Partner"}
                {m.county && (
                  <span className="ml-2 inline-flex items-center gap-0.5">
                    <MapPin className="inline h-2.5 w-2.5" /> {m.county}
                  </span>
                )}
              </p>
              <h3 className="font-display mt-0.5 text-xl leading-snug">{m.organization_name}</h3>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 pt-1">
              {m.verification_status === "verified" && (
                <ShieldCheck className="h-4 w-4 text-emerald-600" aria-label="Verified" />
              )}
              {m.is_featured && (
                <Star className="h-4 w-4 text-amber-500" aria-label="Featured" />
              )}
            </div>
          </div>

          {m.description && (
            <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{m.description}</p>
          )}

          {m.reasons.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    m.explanation.confidence === "high"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : m.explanation.confidence === "medium"
                        ? "border-sky-200 bg-sky-50 text-sky-800"
                        : "border-border bg-muted text-muted-foreground"
                  }`}
                  title={`Match confidence: ${m.explanation.confidence}`}
                >
                  {confidenceBandLabel(m.explanation.confidence)}
                </span>
              </div>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[12px] text-foreground/85">
                {m.explanation.reasons.slice(0, 4).map((why, i) => (
                  <li key={i}>{why}</li>
                ))}
              </ul>
            </div>
          )}

          {m.explanation.conflicts.length > 0 && (
            <div className="mt-2 flex gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
              <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-amber-900">
                {m.explanation.conflicts.slice(0, 3).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-2 text-sm text-foreground/85">
            <span className="font-medium">Suggested next step:</span> {m.suggested_next_step}
          </p>

          {m.website_url && (
            <a
              href={m.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Visit organization website <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
