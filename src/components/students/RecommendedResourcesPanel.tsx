import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, ExternalLink, BookmarkPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  recommendResourcesForStudent,
  type RecommendedResource,
} from "@/lib/resource-recommender.functions";
import { saveResource } from "@/lib/saved-resources.functions";

export function RecommendedResourcesPanel({ studentId }: { studentId: string }) {
  const fetchRecs = useServerFn(recommendResourcesForStudent);
  const save = useServerFn(saveResource);
  const [items, setItems] = useState<RecommendedResource[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecs({ data: { student_id: studentId, limit: 6 } })
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [studentId, fetchRecs]);

  async function onSave(id: string) {
    setSavingId(id);
    try {
      await save({ data: { resource_id: id, collection_name: "For this student" } });
      toast.success("Saved to your library.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-display text-2xl">Recommended For This Student</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pulled from your verified resource library based on this student's strengths, interests,
        needs, and grade level.
      </p>

      {items === null && (
        <p className="mt-6 text-sm text-muted-foreground">Looking for matches…</p>
      )}

      {items !== null && items.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          Add more detail to this student's profile (interests, strengths, needs) to unlock tailored
          recommendations.
        </p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((r) => (
            <li
              key={r.id}
              className="flex flex-col justify-between rounded-xl border bg-background p-4"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {r.resource_type.replace(/_/g, " ")}
                  {r.source_name ? ` · ${r.source_name}` : ""}
                </p>
                <p className="mt-1.5 text-sm font-medium leading-snug">{r.title}</p>
                {r.description && (
                  <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">
                    {r.description}
                  </p>
                )}
                {r.reasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.reasons.slice(0, 3).map((why, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                      >
                        {why}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
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
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={savingId === r.id}
                  onClick={() => onSave(r.id)}
                >
                  {savingId === r.id ? (
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
