import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Phone, Mail, Users, Calendar } from "lucide-react";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { listAdminPartners } from "@/lib/partner-network.functions";
import {
  listAllOutreach,
  listOutreachForPartner,
  addOutreachEntry,
  deleteOutreachEntry,
} from "@/lib/partner-outreach.functions";

export const Route = createFileRoute("/_authenticated/owner/partner-outreach")({
  head: () => ({ meta: [{ title: "Partner Outreach — Admin Hub" }] }),
  component: PartnerOutreachPage,
});

type OutreachEntry = {
  id: string;
  partner_id: string;
  contacted_at: string;
  channel: string;
  contact_person: string | null;
  summary: string;
  outcome: string | null;
  next_follow_up_date: string | null;
  partner?: { id: string; organization_name: string; partner_type: string; outreach_status: string };
};

type Partner = {
  id: string;
  organization_name: string;
  partner_type: string;
  outreach_status: string;
  next_follow_up_date: string | null;
};

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  phone: <Phone className="h-3.5 w-3.5" />,
  meeting: <Users className="h-3.5 w-3.5" />,
  event: <Calendar className="h-3.5 w-3.5" />,
  other: null,
};

function PartnerOutreachPage() {
  const fetchEntries = useServerFn(listAllOutreach);
  const fetchPartners = useServerFn(listAdminPartners);
  const fetchForPartner = useServerFn(listOutreachForPartner);
  const addEntry = useServerFn(addOutreachEntry);
  const removeEntry = useServerFn(deleteOutreachEntry);

  const [entries, setEntries] = useState<OutreachEntry[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerEntries, setPartnerEntries] = useState<OutreachEntry[]>([]);

  const refresh = async () => {
    setLoading(true);
    const [e, p] = await Promise.all([fetchEntries(), fetchPartners()]);
    setEntries(e.entries as OutreachEntry[]);
    setPartners(p.partners as Partner[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedPartner) return;
    fetchForPartner({ data: { partner_id: selectedPartner.id } }).then((r) =>
      setPartnerEntries(r.entries as OutreachEntry[]),
    );
  }, [selectedPartner, fetchForPartner]);

  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      if (statusFilter !== "all" && p.outreach_status !== statusFilter) return false;
      if (q && !p.organization_name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [partners, statusFilter, q]);

  const followups = useMemo(
    () =>
      partners
        .filter((p) => p.next_follow_up_date)
        .sort((a, b) => (a.next_follow_up_date! < b.next_follow_up_date! ? -1 : 1))
        .slice(0, 8),
    [partners],
  );

  return (
    <OwnerShell
      title="Partner Outreach"
      description="Track outreach across the Connecticut partner network. Statuses cascade from outreach entries to partner records automatically."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total partners" value={partners.length} />
        <Stat
          label="Active conversations"
          value={partners.filter((p) => p.outreach_status === "in_conversation").length}
        />
        <Stat
          label="Need follow-up"
          value={partners.filter((p) => p.outreach_status === "needs_follow_up").length}
        />
      </div>

      {followups.length > 0 && (
        <section className="mt-6 rounded-2xl border bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Upcoming follow-ups</h2>
          <ul className="mt-2 grid gap-1 text-xs text-amber-900 md:grid-cols-2">
            {followups.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <button
                  className="text-left hover:underline"
                  onClick={() => setSelectedPartner(p)}
                >
                  {p.organization_name}
                </button>
                <span className="font-mono">{p.next_follow_up_date}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_auto]">
        <Input
          placeholder="Search partner organizations…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="not_contacted">Not Contacted</SelectItem>
            <SelectItem value="researching">Researching</SelectItem>
            <SelectItem value="outreach_needed">Outreach Needed</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="in_conversation">In Conversation</SelectItem>
            <SelectItem value="needs_follow_up">Needs Follow-Up</SelectItem>
            <SelectItem value="approved_partner">Approved Partner</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={refresh}>
          Refresh
        </Button>
      </section>

      {loading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading outreach…
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Organization</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Next follow-up</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{p.organization_name}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {p.partner_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="text-[10px]">
                      {p.outreach_status?.replace(/_/g, " ") ?? "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {p.next_follow_up_date ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedPartner(p)}>
                      Log outreach
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No partners match those filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {entries.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <ul className="mt-3 space-y-2">
            {entries.slice(0, 12).map((e) => (
              <li key={e.id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                <span className="mt-0.5 text-muted-foreground">
                  {CHANNEL_ICON[e.channel] ?? <Mail className="h-3.5 w-3.5" />}
                </span>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{e.partner?.organization_name}</span> ·{" "}
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.contacted_at).toLocaleDateString()}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{e.summary}</p>
                </div>
                {e.outcome && (
                  <Badge variant="outline" className="text-[10px]">
                    {e.outcome.replace(/_/g, " ")}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Sheet open={!!selectedPartner} onOpenChange={(o) => !o && setSelectedPartner(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selectedPartner && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedPartner.organization_name}</SheetTitle>
              </SheetHeader>
              <OutreachForm
                partnerId={selectedPartner.id}
                onSaved={async () => {
                  await refresh();
                  const r = await fetchForPartner({
                    data: { partner_id: selectedPartner.id },
                  });
                  setPartnerEntries(r.entries as OutreachEntry[]);
                }}
                addEntry={addEntry}
              />
              <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                History
              </h3>
              <ul className="mt-3 space-y-2">
                {partnerEntries.length === 0 && (
                  <li className="text-sm text-muted-foreground">No outreach logged yet.</li>
                )}
                {partnerEntries.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.contacted_at).toLocaleDateString()} · {e.channel}
                        {e.contact_person ? ` · ${e.contact_person}` : ""}
                      </p>
                      <p className="mt-1 text-sm">{e.summary}</p>
                      {e.outcome && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {e.outcome.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {e.next_follow_up_date && (
                        <p className="mt-1 text-xs text-amber-700">
                          Follow up: {e.next_follow_up_date}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await removeEntry({ data: { id: e.id } });
                        toast.success("Entry deleted");
                        const r = await fetchForPartner({
                          data: { partner_id: selectedPartner.id },
                        });
                        setPartnerEntries(r.entries as OutreachEntry[]);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SheetContent>
      </Sheet>
    </OwnerShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
    </div>
  );
}

function OutreachForm({
  partnerId,
  onSaved,
  addEntry,
}: {
  partnerId: string;
  onSaved: () => void;
  addEntry: (a: { data: Record<string, unknown> }) => Promise<unknown>;
}) {
  const [channel, setChannel] = useState("email");
  const [contactPerson, setContactPerson] = useState("");
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState<string>("");
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!summary.trim()) {
      toast.error("Summary is required");
      return;
    }
    setSaving(true);
    try {
      await addEntry({
        data: {
          partner_id: partnerId,
          channel,
          contact_person: contactPerson || undefined,
          summary: summary.trim(),
          outcome: outcome || undefined,
          next_follow_up_date: followUp || undefined,
        },
      });
      toast.success("Outreach logged");
      setSummary("");
      setContactPerson("");
      setOutcome("");
      setFollowUp("");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 space-y-3 rounded-xl border bg-muted/30 p-4">
      <p className="text-sm font-semibold">Log a new outreach entry</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 inline-block text-xs">Channel</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 inline-block text-xs">Contact person</Label>
          <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="mb-1 inline-block text-xs">Summary</Label>
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 inline-block text-xs">Outcome</Label>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no_response">No response</SelectItem>
              <SelectItem value="interested">Interested</SelectItem>
              <SelectItem value="follow_up">Follow up</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 inline-block text-xs">Next follow-up</Label>
          <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </div>
      </div>
      <Button onClick={submit} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Log entry
      </Button>
    </div>
  );
}
