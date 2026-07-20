import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  HeartHandshake,
  ExternalLink,
  BookmarkPlus,
  Loader2,
  ShieldCheck,
  Star,
  MapPin,
  CheckSquare,
  CalendarPlus,
  MessageSquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { confidenceBandLabel } from "@/lib/partner-match-explanation";
import {
  matchPartnersForStudent,
  persistPartnerMatch,
  type PartnerMatch,
} from "@/lib/partner-matching.functions";
import {
  addRecommendationToActionItems,
  addRecommendationToCalendar,
  addRecommendationToNextMeetingPrep,
} from "@/lib/recommendation-actions.functions";

const STATUS_LABEL: Record<string, string> = {
  verified: "Verified",
  needs_review: "Needs Review",
  community_resource: "Community Resource",
  potential: "Potential Partner",
  pending_approval: "Pending Approval",
  featured: "Featured",
  archived: "Archived",
  outdated: "Outdated",
};

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  const tone =
    status === "verified" || status === "featured"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "needs_review"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : status === "community_resource"
          ? "bg-sky-50 text-sky-700 border-sky-200"
          : status === "potential"
            ? "bg-violet-50 text-violet-700 border-violet-200"
            : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`text-[10px] ${tone}`}>
      {(status === "verified" || status === "featured") && <ShieldCheck className="mr-1 h-3 w-3" />}
      {label}
    </Badge>
  );
}

function ConfidenceChip({ band }: { band: "low" | "medium" | "high" }) {
  const tone =
    band === "high"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : band === "medium"
        ? "bg-sky-100 text-sky-800 border-sky-200"
        : "bg-muted text-muted-foreground border-border";
  return (
    <Badge
      variant="outline"
      className={`text-[10px] ${tone}`}
      title={`Match confidence: ${band}`}
    >
      {confidenceBandLabel(band)}
    </Badge>
  );
}


export function RecommendedPartnersPanel({ studentId }: { studentId: string }) {
  const fetchMatches = useServerFn(matchPartnersForStudent);
  const save = useServerFn(persistPartnerMatch);
  const addAction = useServerFn(addRecommendationToActionItems);
  const addCal = useServerFn(addRecommendationToCalendar);
  const addPrep = useServerFn(addRecommendationToNextMeetingPrep);

  const [items, setItems] = useState<PartnerMatch[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches({ data: { student_id: studentId, limit: 6 } })
      .then((r) => setItems(r.matches))
      .catch(() => setItems([]));
  }, [studentId, fetchMatches]);

  async function run<T>(key: string, label: string, fn: () => Promise<T>) {
    setBusy(key);
    try {
      const res: any = await fn();
      if (res && res.ok === false && res.message) toast.message(res.message);
      else toast.success(label);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not ${label.toLowerCase()}.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <HeartHandshake className="h-5 w-5 text-primary" />
        <h2 className="font-display text-2xl">Recommended Partners</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Matched to this student's pathway goals, age band, interests, support needs, county, and
        readiness gaps. Partner organizations never see private student documents or IEP content.
      </p>

      {items === null && (
        <p className="mt-6 text-sm text-muted-foreground">Finding matches…</p>
      )}

      {items !== null && items.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          Add interests, transition status, or support needs to this student's profile to unlock
          partner matches.
        </p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((m) => {
            const baseInput = {
              student_id: studentId,
              source_kind: "partner" as const,
              source_id: m.partner_id,
              title: m.organization_name,
              context_note: m.reasons.join(" • "),
              next_step: m.suggested_next_step,
              related_goal_area: m.connects_to_goal_area ?? undefined,
            };
            return (
              <li
                key={m.partner_id}
                className="flex flex-col justify-between rounded-xl border bg-background p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {m.partner_type?.replace(/_/g, " ") || "Partner"}
                    </p>
                    <div className="flex items-center gap-1">
                      <StatusBadge status={m.verification_status} />
                      {m.is_featured && <Star className="h-3.5 w-3.5 text-amber-500" aria-label="Featured" />}
                    </div>
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
                    <div className="mt-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Why this is recommended
                        </p>
                        <ConfidenceChip band={m.explanation.confidence} />
                      </div>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-foreground/85">
                        {m.explanation.reasons.slice(0, 4).map((why, i) => (
                          <li key={i}>{why}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {m.explanation.conflicts.length > 0 && (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/70 p-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                        Verify before sharing
                      </p>
                      <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[11px] text-amber-900">
                        {m.explanation.conflicts.slice(0, 3).map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}


                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    {m.connects_to_goal_area && (
                      <>
                        <dt className="font-medium text-foreground/80">Connects to:</dt>
                        <dd className="capitalize">{m.connects_to_goal_area.replace(/_/g, " ")} goal area</dd>
                      </>
                    )}
                    {m.connects_to_support_need && (
                      <>
                        <dt className="font-medium text-foreground/80">Support need:</dt>
                        <dd className="capitalize">{m.connects_to_support_need}</dd>
                      </>
                    )}
                    <dt className="font-medium text-foreground/80">Who it's for:</dt>
                    <dd className="capitalize">{m.audience}</dd>
                    <dt className="font-medium text-foreground/80">Next step:</dt>
                    <dd className="text-foreground/90">{m.suggested_next_step}</dd>
                  </dl>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
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
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Save partner"
                      disabled={busy === `save-${m.partner_id}`}
                      onClick={() =>
                        run(`save-${m.partner_id}`, `Saved ${m.organization_name}`, () =>
                          save({
                            data: {
                              student_id: studentId,
                              partner_id: m.partner_id,
                              match_reason: m.reasons.join(" • ") || "Matched by profile",
                              next_step: m.suggested_next_step,
                            },
                          }),
                        )
                      }
                    >
                      {busy === `save-${m.partner_id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <BookmarkPlus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Add to action items"
                      disabled={busy === `act-${m.partner_id}`}
                      onClick={() =>
                        run(`act-${m.partner_id}`, "Added to action items", () =>
                          addAction({ data: baseInput }),
                        )
                      }
                    >
                      {busy === `act-${m.partner_id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckSquare className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Add follow-up to calendar"
                      disabled={busy === `cal-${m.partner_id}`}
                      onClick={() =>
                        run(`cal-${m.partner_id}`, "Added to calendar", () =>
                          addCal({ data: baseInput }),
                        )
                      }
                    >
                      {busy === `cal-${m.partner_id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CalendarPlus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    {m.discuss_at_next_meeting && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Discuss at next meeting"
                        disabled={busy === `prep-${m.partner_id}`}
                        onClick={() =>
                          run(`prep-${m.partner_id}`, "Queued for next meeting", () =>
                            addPrep({ data: baseInput }),
                          )
                        }
                      >
                        {busy === `prep-${m.partner_id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
