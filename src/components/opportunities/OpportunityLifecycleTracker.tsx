import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Mail,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PartnerMatch } from "@/lib/partner-matching.functions";

/**
 * Lightweight, client-side lifecycle tracker for saved partner matches.
 * Persists status per (studentId, partnerId) in localStorage so families and
 * educators can see where each partner sits in the outreach pipeline without
 * requiring a new server round-trip. When a real `saved_matches` server fn
 * lands, this can be replaced by an authoritative query.
 */

export type LifecycleStage =
  | "saved"
  | "contacted"
  | "applied"
  | "enrolled"
  | "not_a_fit";

const STAGES: {
  key: LifecycleStage;
  label: string;
  icon: typeof Bookmark;
  tone: string;
  hint: string;
}[] = [
  { key: "saved", label: "Saved", icon: Bookmark, tone: "bg-muted text-foreground", hint: "In your shortlist" },
  { key: "contacted", label: "Contacted", icon: Mail, tone: "bg-sky-100 text-sky-900", hint: "Reached out" },
  { key: "applied", label: "Applied", icon: FileText, tone: "bg-amber-100 text-amber-900", hint: "Intake started" },
  { key: "enrolled", label: "Enrolled", icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-900", hint: "Connected & active" },
  { key: "not_a_fit", label: "Not a fit", icon: XCircle, tone: "bg-rose-100 text-rose-900", hint: "Ruled out" },
];

const STORAGE_KEY = "tf.opportunity-lifecycle.v1";

type Store = Record<string, LifecycleStage>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

function writeStore(next: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function keyFor(studentId: string, partnerId: string) {
  return `${studentId}::${partnerId}`;
}

export function OpportunityLifecycleTracker({
  studentId,
  matches,
}: {
  studentId: string;
  matches: PartnerMatch[];
}) {
  const [store, setStore] = useState<Store>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(readStore());
    setHydrated(true);
  }, []);

  const trackedMatches = useMemo(() => {
    if (!hydrated) return [] as (PartnerMatch & { stage: LifecycleStage })[];
    return matches
      .map((m) => {
        const stage = store[keyFor(studentId, m.partner_id)];
        return stage ? { ...m, stage } : null;
      })
      .filter(Boolean) as (PartnerMatch & { stage: LifecycleStage })[];
  }, [matches, store, studentId, hydrated]);

  const counts = useMemo(() => {
    const c: Record<LifecycleStage, number> = {
      saved: 0,
      contacted: 0,
      applied: 0,
      enrolled: 0,
      not_a_fit: 0,
    };
    for (const m of trackedMatches) c[m.stage] += 1;
    return c;
  }, [trackedMatches]);

  function setStage(partnerId: string, stage: LifecycleStage | null) {
    setStore((prev) => {
      const next = { ...prev };
      const k = keyFor(studentId, partnerId);
      if (stage === null) delete next[k];
      else next[k] = stage;
      writeStore(next);
      return next;
    });
  }

  // Expose a "quick add" API so the parent list can seed a match into the tracker.
  // Rendered as a compact stage picker embedded inline with each match card.

  if (!hydrated) return null;

  return (
    <section className="mt-6 rounded-2xl border bg-card p-5 shadow-soft">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg">Opportunity Lifecycle</h3>
          <p className="text-xs text-muted-foreground">
            Track where each saved partner sits — from first outreach through enrollment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <Badge key={s.key} className={`${s.tone} text-[10px]`} variant="secondary">
              {s.label}: {counts[s.key]}
            </Badge>
          ))}
        </div>
      </header>

      {/* Pipeline visual */}
      <ol className="mt-5 grid gap-2 sm:grid-cols-5">
        {STAGES.filter((s) => s.key !== "not_a_fit").map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.key} className="relative rounded-xl border bg-background p-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${s.tone}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Step {i + 1}
                  </p>
                  <p className="text-sm font-medium">{s.label}</p>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.hint}</p>
            </li>
          );
        })}
      </ol>

      {/* Match rows with stage picker */}
      <div className="mt-6 space-y-2">
        {matches.map((m) => {
          const currentStage = store[keyFor(studentId, m.partner_id)] ?? null;
          const currentMeta = STAGES.find((s) => s.key === currentStage);
          return (
            <div
              key={m.partner_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{m.organization_name}</p>
                  {currentMeta && (
                    <Badge className={`${currentMeta.tone} text-[10px]`} variant="secondary">
                      {currentMeta.label}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  Next step: {m.suggested_next_step}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {STAGES.map((s) => {
                  const active = currentStage === s.key;
                  return (
                    <Button
                      key={s.key}
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setStage(m.partner_id, active ? null : s.key)}
                      aria-pressed={active}
                    >
                      {s.label}
                    </Button>
                  );
                })}
                {m.website_url && (
                  <Button size="sm" variant="ghost" asChild className="h-7 px-2 text-[11px]">
                    <a href={m.website_url} target="_blank" rel="noopener noreferrer">
                      Visit <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {matches.length === 0 && (
          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Save partner matches above to start tracking outreach.
          </p>
        )}
      </div>

      {trackedMatches.length > 0 && (
        <p className="mt-4 flex items-center gap-1 text-[11px] text-muted-foreground">
          <ArrowRight className="h-3 w-3" />
          Progress is stored on this device — bring notes into the next PPT meeting.
        </p>
      )}
    </section>
  );
}
