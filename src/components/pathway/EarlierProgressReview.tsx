import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { EarlierGoalProgress, GoalProgressStatus } from "@/lib/earlier-goal-progress";
import type { GoalTrackerItem } from "@/lib/goal-tracker-items";
const labels: Record<GoalProgressStatus, string> = { "not-started": "Not started", "in-progress": "In progress", met: "Met" };

export function EarlierProgressReview({ entries, items, statuses, saving, onApply }: {
  entries: EarlierGoalProgress[]; items: GoalTrackerItem[]; statuses: Record<string, GoalProgressStatus>;
  saving: boolean; onApply: (sourceId: string, targetId: string) => Promise<boolean>;
}) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef(false);
  const applying = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const source = entries.find(entry => entry.id === sourceId);
  const target = items.find(item => item.id === targetId);
  const currentStatus = target ? statuses[target.id] ?? "not-started" : undefined;
  useEffect(() => { setConfirmed(false); }, [sourceId, targetId, source?.status, currentStatus]);
  async function apply() {
    if (!source || !target || !confirmed || saving || applying.current) return;
    applying.current = true;
    try {
      const saved = await onApply(source.id, target.id);
      if (active.current && saved) {
        setMessage(`Saved ${labels[source.status]} for “${target.label}”. The earlier entry is unchanged.`);
        setConfirmed(false);
      }
    } finally { applying.current = false; }
  }
  return (
    <details className="mb-4 rounded-2xl border bg-card p-4">
      <summary className="cursor-pointer text-sm font-semibold">Review Earlier Progress</summary>
      <p className="mt-3 text-sm text-muted-foreground">The original step wording wasn't saved with these entries. Choose a current step only if you recognize the match. Copying changes that step's current status; the earlier entry stays saved.</p>
      <label className="mt-4 block text-sm">Earlier Entry
        <select value={sourceId} disabled={saving} onChange={event => { setSourceId(event.target.value); setConfirmed(false); setMessage(""); }} className="mt-1 w-full rounded-lg border bg-background p-2">
          <option value="">Choose an earlier entry</option>
          {entries.map(entry => <option key={entry.id} value={entry.id}>{entry.label} — {labels[entry.status]}</option>)}
        </select>
      </label>
      <label className="mt-3 block text-sm">Current Step
        <select value={targetId} disabled={saving} onChange={event => { setTargetId(event.target.value); setConfirmed(false); setMessage(""); }} className="mt-1 w-full rounded-lg border bg-background p-2">
          <option value="">Choose a current step</option>
          {items.map(item => <option key={item.id} value={item.id}>{item.group} — {item.label}</option>)}
        </select>
      </label>
      {source && target && <div className="mt-3 space-y-3 text-sm">
        <p>Set “{target.label}” from <strong>{labels[statuses[target.id] ?? "not-started"]}</strong> to <strong>{labels[source.status]}</strong>.</p>
        <label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} disabled={saving} onChange={event => { setConfirmed(event.target.checked); setMessage(""); }} className="mt-1" />I reviewed this step and want to apply the earlier status.</label>
      </div>}
      <Button className="mt-4" disabled={!source || !target || !confirmed || saving} onClick={() => { void apply(); }}>Apply Reviewed Progress</Button>
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    </details>
  );
}
