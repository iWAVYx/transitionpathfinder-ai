import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";
import { loadOwnerTextWork, inspectOwnerTextWork } from "@/lib/owner/text-work-review.functions";
import { TEXT_HOLD_LABELS, TEXT_WORK_READ_MESSAGE, type TextWorkQueue, type TextWorkDetail } from "@/lib/owner/text-work-review-contract";
export function TextWorkReviewPanel() {
  const { user } = useAuth(); return user?.id ? <TextWorkSession key={user.id} viewer={user.id} /> : null;
}
function TextWorkSession({ viewer }: { viewer: string }) {
  const roles = useServerFn(getMyAdminRoles), load = useServerFn(loadOwnerTextWork), inspect = useServerFn(inspectOwnerTextWork);
  const [access, setAccess] = useState<"checking"|"owner"|"denied"|"error">("checking"), [attempt, setAttempt] = useState(0);
  const [queue, setQueue] = useState<TextWorkQueue|null>(null), [detail, setDetail] = useState<TextWorkDetail|null>(null), [error, setError] = useState<string|null>(null), [busy, setBusy] = useState(false);
  const live = useRef(true), locked = useRef(false);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => { let active = true; setAccess("checking"); roles({ data: { expected_viewer_id: viewer } }).then(value => { if (active) setAccess(value.roles.includes("platform_owner") ? "owner" : "denied"); }).catch(() => { if (active) setAccess("error"); }); return () => { active = false; }; }, [roles, viewer, attempt]);
  const run = async (work: () => Promise<void>) => { if (locked.current) return; locked.current = true; setBusy(true); setError(null); try { await work(); } catch { if (live.current) { setQueue(null); setDetail(null); setError(TEXT_WORK_READ_MESSAGE); } } finally { locked.current = false; if (live.current) setBusy(false); } };
  const list = (more = false) => void run(async () => { setDetail(null); const value = await load({ data: { expected_viewer_id: viewer, ...(more && queue?.next_cursor ? { after_operation_id: queue.next_cursor } : {}) } }); if (!live.current) return; if (more && queue && value.control_revision !== queue.control_revision) throw new Error(); setQueue(more && queue ? { ...value, items: [...queue.items, ...value.items.filter(x => !queue.items.some(old => old.operation_id === x.operation_id))] } : value); });
  const check = (operation: string) => void run(async () => { setDetail(null); const value = await inspect({ data: { expected_viewer_id: viewer, operation_id: operation } }); if (live.current) setDetail(value); });
  if (access === "checking" || access === "denied") return null;
  return <section aria-labelledby="text-work-review-heading" className="mt-6 rounded-lg border border-border bg-background p-4 space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="max-w-2xl"><h2 id="text-work-review-heading" className="text-base font-semibold">Pasted Text Processing</h2><p className="mt-1 text-sm text-muted-foreground">Check tasks started from text pasted into a document review. Processing must be paused before checking their status. Student text is not shown here.</p></div>{access === "owner" && <Button variant="outline" size="sm" disabled={busy} onClick={() => list()}>{queue ? "Refresh Text Tasks" : "Load Text Tasks"}</Button>}</div>
    {access === "error" ? <div><p role="alert" className="text-sm">Review access could not be confirmed.</p><Button variant="outline" size="sm" onClick={() => setAttempt(n => n+1)}>Check Access</Button></div> : <>
      {queue && <div className="space-y-3">{queue.items.length === 0 ? <p className="text-sm text-muted-foreground">No unfinished text tasks are in this list. This does not confirm that an external service has stopped.</p> : <ul className="divide-y rounded-md border">{queue.items.map(item => <li key={item.operation_id} className="flex flex-wrap items-center justify-between gap-3 p-3"><div><p className="text-sm font-medium">Text Review</p><p className="text-xs text-muted-foreground">{item.state === "needs_review" ? "Needs Review" : "In Progress"} · Task {item.operation_id.slice(-8)}</p></div><Button variant="outline" size="sm" disabled={busy} onClick={() => check(item.operation_id)}>Check Status</Button></li>)}</ul>}{queue.has_more && <Button variant="outline" size="sm" disabled={busy} onClick={() => list(true)}>Load More Text Tasks</Button>}</div>}
      {detail && <div className="rounded-md border p-3 space-y-3"><h3 className="text-sm font-semibold">Text Review Status</h3><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Status</dt><dd>{detail.state === "completed" ? "Saved Review Recorded" : detail.state === "needs_review" ? "Needs Review" : "In Progress"}</dd></div><div><dt className="text-muted-foreground">Reserved Work</dt><dd>{detail.remaining_shared_units}</dd></div>{detail.hold_reason && <div><dt className="text-muted-foreground">Reason for Review</dt><dd>{TEXT_HOLD_LABELS[detail.hold_reason]}</dd></div>}</dl><p className="text-xs text-muted-foreground">{detail.recorded_completion ? "A completed save is recorded. This check does not restart processing." : "Keep this work reserved until its result or a verified recovery is confirmed. This page cannot restart or release it."}</p><Button variant="outline" size="sm" disabled={busy} onClick={() => check(detail.operation_id)}>Refresh Task Status</Button></div>}
      {busy && <p role="status" className="text-sm text-muted-foreground">Checking text tasks…</p>}{error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
    </>}
  </section>;
}
