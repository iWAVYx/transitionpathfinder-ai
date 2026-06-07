import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { HeartHandshake, ExternalLink, BookmarkPlus, Loader2, ShieldCheck, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  matchPartnersForStudent,
  persistPartnerMatch,
  type PartnerMatch,
} from "@/lib/partner-matching.functions";

export function RecommendedPartnersPanel({ studentId }: { studentId: string }) {
  const fetchMatches = useServerFn(matchPartnersForStudent);
  const save = useServerFn(persistPartnerMatch);
  const [items, setItems] = useState<PartnerMatch[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches({ data: { student_id: studentId, limit: 6 } })
      .then((r) => setItems(r.matches))
      .catch(() => setItems([]));
  }, [studentId, fetchMatches]);

  async function onSave(m: PartnerMatch) {
    setSavingId(m.partner_id);
    try {
      await save({
        data: {
          student_id: studentId,
          partner_id: m.partner_id,
          match_reason: m.reasons.join(" • ") || "Matched by profile",
          next_step: m.suggested_next_step,
        },
      });
      toast.success(`Saved ${m.organization_name}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save partner.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <HeartHandshake className="h-5 w-5 text-primary" />
        <h2 className="font-display text-2xl">Recommended Partners</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Organizations matched to this student's pathway goals, interests, location, and support needs.
      </p>

      {items === null && (
        <p className="mt-6 text-sm text-muted-foreground">Finding matches…</p>
      )}

      {items !== null && items.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          Add interests, transition status, or support needs to this student's profile to unlock partner matches.
        </p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((m) => (
            <li
              key={m.partner_id}
              className="flex flex-col justify-between rounded-xl border bg-background p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                    {m.partner_type?.replace(/_/g, " ") || "Partner"}
                  </p>
                  {m.verification_status === "verified" && (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-label="Verified" />
                  )}
                  {m.is_featured && (
                    <Star className="h-3.5 w-3.5 text-amber-500" aria-label="Featured" />
                  )}
                </div>
                <p className="mt-1.5 text-sm font-medium leading-snug">{m.organization_name}</p>
                {m.county && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {m.county}
                  </p>
                )}
                {m.description && (
                  <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">
                    {m.description}
                  </p>
                )}
                {m.reasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.reasons.slice(0, 3).map((why, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                      >
                        {why}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[11px] italic text-muted-foreground">
                  {m.suggested_next_step}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                {m.website_url ? (
                  <a
                    href={m.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Visit site <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">No website</span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={savingId === m.partner_id}
                  onClick={() => onSave(m)}
                >
                  {savingId === m.partner_id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <BookmarkPlus className="h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
