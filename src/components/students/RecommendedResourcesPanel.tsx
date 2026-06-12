import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles,
  ExternalLink,
  BookmarkPlus,
  Loader2,
  CheckSquare,
  CalendarPlus,
  MessageSquarePlus,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  recommendResourcesForStudent,
  type RecommendedResource,
} from "@/lib/resource-recommender.functions";
import { saveResource } from "@/lib/saved-resources.functions";
import {
  addRecommendationToActionItems,
  addRecommendationToCalendar,
  addRecommendationToNextMeetingPrep,
} from "@/lib/recommendation-actions.functions";

const REVIEW_LABEL: Record<string, string> = {
  verified: "Verified",
  needs_review: "Needs Review",
  community_resource: "Community Resource",
  potential: "Potential",
  archived: "Archived",
  outdated: "Outdated",
};

function ReviewBadge({ status }: { status: string }) {
  const label = REVIEW_LABEL[status] ?? "Verified";
  const tone =
    status === "verified"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "needs_review"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : status === "community_resource"
          ? "bg-sky-50 text-sky-700 border-sky-200"
          : status === "outdated" || status === "archived"
            ? "bg-muted text-muted-foreground"
            : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`text-[10px] ${tone}`}>
      {status === "verified" && <ShieldCheck className="mr-1 h-3 w-3" />}
      {label}
    </Badge>
  );
}

export function RecommendedResourcesPanel({ studentId }: { studentId: string }) {
  const fetchRecs = useServerFn(recommendResourcesForStudent);
  const save = useServerFn(saveResource);
  const addAction = useServerFn(addRecommendationToActionItems);
  const addCal = useServerFn(addRecommendationToCalendar);
  const addPrep = useServerFn(addRecommendationToNextMeetingPrep);

  const [items, setItems] = useState<RecommendedResource[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetchRecs({ data: { student_id: studentId, limit: 6 } })
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [studentId, fetchRecs]);

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
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-display text-2xl">Recommended For This Student</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Matched to this student's age, grade, transition stage, goals, support needs, family
        priorities, Student Voice, and readiness gaps. Archived and outdated resources are excluded.
      </p>

      {items === null && (
        <p className="mt-6 text-sm text-muted-foreground">Looking for matches…</p>
      )}

      {items !== null && items.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          Add more detail to this student's profile (interests, strengths, needs, goals) to unlock
          tailored recommendations.
        </p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((r) => {
            const baseInput = {
              student_id: studentId,
              source_kind: "resource" as const,
              source_id: r.id,
              title: r.title,
              context_note: r.reasons.join(" • "),
              next_step: r.url ? `Open: ${r.url}` : undefined,
              related_goal_area: r.connects_to_goal_area ?? undefined,
            };
            return (
              <li
                key={r.id}
                className="flex flex-col justify-between rounded-xl border bg-background p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {r.resource_type.replace(/_/g, " ")}
                      {r.source_name ? ` · ${r.source_name}` : ""}
                    </p>
                    <ReviewBadge status={r.review_status} />
                  </div>
                  <p className="mt-1.5 text-sm font-medium leading-snug">{r.title}</p>
                  {r.description && (
                    <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">
                      {r.description}
                    </p>
                  )}

                  {/* Why + connections */}
                  {r.reasons.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Why this is recommended
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {r.reasons.slice(0, 3).map((why, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                          >
                            {why}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    {r.connects_to_goal_area && (
                      <>
                        <dt className="font-medium text-foreground/80">Connects to:</dt>
                        <dd className="capitalize">{r.connects_to_goal_area} goal area</dd>
                      </>
                    )}
                    {r.connects_to_support_need && (
                      <>
                        <dt className="font-medium text-foreground/80">Support need:</dt>
                        <dd className="capitalize">{r.connects_to_support_need}</dd>
                      </>
                    )}
                    <dt className="font-medium text-foreground/80">Who it's for:</dt>
                    <dd className="capitalize">{r.audience}</dd>
                  </dl>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">No link</span>
                  )}
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Save to your library"
                      disabled={busy === `save-${r.id}`}
                      onClick={() =>
                        run(`save-${r.id}`, "Saved to your library", () =>
                          save({ data: { resource_id: r.id, collection_name: "For this student" } }),
                        )
                      }
                    >
                      {busy === `save-${r.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <BookmarkPlus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Add to action items"
                      disabled={busy === `act-${r.id}`}
                      onClick={() =>
                        run(`act-${r.id}`, "Added to action items", () =>
                          addAction({ data: baseInput }),
                        )
                      }
                    >
                      {busy === `act-${r.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckSquare className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Add follow-up to calendar"
                      disabled={busy === `cal-${r.id}`}
                      onClick={() =>
                        run(`cal-${r.id}`, "Added to calendar", () =>
                          addCal({ data: baseInput }),
                        )
                      }
                    >
                      {busy === `cal-${r.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CalendarPlus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    {r.discuss_at_next_meeting && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Discuss at next meeting"
                        disabled={busy === `prep-${r.id}`}
                        onClick={() =>
                          run(`prep-${r.id}`, "Queued for next meeting", () =>
                            addPrep({ data: baseInput }),
                          )
                        }
                      >
                        {busy === `prep-${r.id}` ? (
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
