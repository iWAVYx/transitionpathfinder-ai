import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, MapPin, ShieldCheck, Star } from "lucide-react";
import {
  matchPartnersForStudent,
  type PartnerMatch,
} from "@/lib/partner-matching.functions";
import { Badge } from "@/components/ui/badge";

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
    <div className="grid gap-3 sm:grid-cols-2 grid-sym-2">
      {items.map((m) => (
        <div key={m.partner_id} className="rounded-2xl border bg-card p-5 lift-card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Badge variant="outline" className="mb-2 uppercase tracking-wider">
                {m.partner_type?.replace(/_/g, " ") || "Partner"}
              </Badge>
              <h3 className="font-display text-lg leading-snug">{m.organization_name}</h3>
              {m.county && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {m.county}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {m.verification_status === "verified" && (
                <ShieldCheck className="h-4 w-4 text-emerald-600" aria-label="Verified" />
              )}
              {m.is_featured && (
                <Star className="h-4 w-4 text-amber-500" aria-label="Featured" />
              )}
            </div>
          </div>
          {m.description && (
            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{m.description}</p>
          )}
          {m.reasons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.reasons.slice(0, 3).map((why, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                >
                  {why}
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 text-sm text-foreground/85">
            <span className="font-medium">Suggested next step:</span> {m.suggested_next_step}
          </p>
          {m.website_url && (
            <a
              href={m.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Visit organization website <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
