import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPartnerWorkspace } from "@/lib/partner-workspace.functions";
import {
  recordImpactEvent,
  listImpactEvents,
  getImpactSummary,
} from "@/lib/partnerforward.functions";

export const Route = createFileRoute("/_authenticated/partners-manage_/impact")({
  head: () => ({ meta: [{ title: "Your Impact — PartnerForward" }] }),
  component: () => (
    <RoleGuard path="/partners-manage">
      <ImpactPage />
    </RoleGuard>
  ),
});

const KINDS = [
  { v: "workshop", l: "Workshop" },
  { v: "tour", l: "Site tour" },
  { v: "referral", l: "Referral" },
  { v: "info_session", l: "Info session" },
  { v: "mentorship_session", l: "Mentorship session" },
  { v: "internship_placement", l: "Internship placement" },
  { v: "other", l: "Other" },
] as const;

type Event = {
  id: string;
  event_kind: string;
  occurred_at: string;
  participant_count: number | null;
  notes: string | null;
};

function ImpactPage() {
  const loadWorkspace = useServerFn(getPartnerWorkspace);
  const loadEvents = useServerFn(listImpactEvents);
  const loadSummary = useServerFn(getImpactSummary);
  const recordEvent = useServerFn(recordImpactEvent);

  const [orgId, setOrgId] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [summary, setSummary] = useState<{
    total_events: number;
    total_participants: number;
    by_kind: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    event_kind: "workshop" as (typeof KINDS)[number]["v"],
    occurred_at: new Date().toISOString().slice(0, 10),
    participant_count: "",
    notes: "",
  });

  useEffect(() => {
    loadWorkspace({ data: {} })
      .then((ws) => {
        if (ws.selected_org) setOrgId(ws.selected_org.id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [loadWorkspace]);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      loadEvents({ data: { organization_id: orgId } }),
      loadSummary({ data: { organization_id: orgId } }),
    ])
      .then(([{ events }, s]) => {
        setEvents((events ?? []) as Event[]);
        setSummary(s);
      })
      .finally(() => setLoading(false));
  }, [orgId, loadEvents, loadSummary]);

  async function handleSubmit() {
    if (!orgId) return;
    setSubmitting(true);
    try {
      await recordEvent({
        data: {
          organization_id: orgId,
          event_kind: form.event_kind,
          occurred_at: new Date(form.occurred_at).toISOString(),
          participant_count: form.participant_count
            ? Number(form.participant_count)
            : null,
          notes: form.notes.trim() || null,
        },
      });
      toast.success("Impact event recorded");
      setForm({
        event_kind: "workshop",
        occurred_at: new Date().toISOString().slice(0, 10),
        participant_count: "",
        notes: "",
      });
      const [{ events }, s] = await Promise.all([
        loadEvents({ data: { organization_id: orgId } }),
        loadSummary({ data: { organization_id: orgId } }),
      ]);
      setEvents((events ?? []) as Event[]);
      setSummary(s);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record");
    } finally {
      setSubmitting(false);
    }
  }

  const kindLabel = useMemo(
    () => Object.fromEntries(KINDS.map((k) => [k.v, k.l])),
    [],
  );

  if (!orgId && !loading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <Breadcrumbs
            trail={[
              { label: "Partner Workspace", to: "/partners-manage" },
              { label: "Impact" },
            ]}
          />
          <p className="mt-6 text-sm text-muted-foreground">
            Set up your partner organization first.
          </p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs
          trail={[
            { label: "Partner Workspace", to: "/partners-manage" },
            { label: "Impact" },
          ]}
        />
        <h1 className="mt-6 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          Your PartnerForward Impact
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Log the workshops, tours, mentorships, and referrals you provide to
          students and families. These counts feed your impact dashboard.
        </p>

        {summary && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  Total events
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {summary.total_events}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  Total participants
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {summary.total_participants}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  Top activity
                </CardTitle>
              </CardHeader>
              <CardContent className="text-base">
                {Object.entries(summary.by_kind)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 1)
                  .map(([k, n]) => (
                    <div key={k}>
                      {kindLabel[k] ?? k} — {n}
                    </div>
                  ))[0] ?? <span className="text-muted-foreground">—</span>}
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Record a new event</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Type</Label>
              <Select
                value={form.event_kind}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, event_kind: v as never }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.v} value={k.v}>
                      {k.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>When</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.occurred_at}
                onChange={(e) =>
                  setForm((p) => ({ ...p, occurred_at: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Participant count</Label>
              <Input
                type="number"
                min={0}
                className="mt-1"
                value={form.participant_count}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    participant_count: e.target.value,
                  }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes (optional)</Label>
              <Textarea
                className="mt-1"
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Plus className="mr-1.5 h-4 w-4" /> Record event
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-10 font-display text-lg font-medium">Recent events</h2>
        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : events.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No events recorded yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-2xl border bg-card">
            {events.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-4 p-4 text-sm">
                <div>
                  <div className="font-medium">{kindLabel[e.event_kind] ?? e.event_kind}</div>
                  {e.notes && (
                    <div className="mt-0.5 text-muted-foreground">{e.notes}</div>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{new Date(e.occurred_at).toLocaleDateString()}</div>
                  {e.participant_count != null && (
                    <div>{e.participant_count} participants</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteShell>
  );
}
