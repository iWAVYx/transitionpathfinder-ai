import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Trash2, Mail, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ownerListWaitlist,
  ownerGetWaitlistEntry,
  ownerUpdateWaitlistEntry,
  ownerAddWaitlistNote,
  ownerDeleteWaitlistEntry,
  WAITLIST_STATUSES,
  type WaitlistEntry,
  type WaitlistNote,
  type WaitlistStatus,
} from "@/lib/owner/owner.functions";
import { convertWaitlistToInvitation } from "@/lib/owner/waitlist-conversion.functions";

export const Route = createFileRoute("/_authenticated/owner/waitlist")({
  head: () => ({ meta: [{ title: "Waitlist — Admin Hub" }] }),
  component: WaitlistPage,
});

const STATUS_COLORS: Record<WaitlistStatus, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  reviewed: "secondary",
  contacted: "secondary",
  invited: "default",
  converted: "default",
  archived: "outline",
};

function WaitlistPage() {
  const list = useServerFn(ownerListWaitlist);
  const update = useServerFn(ownerUpdateWaitlistEntry);
  const del = useServerFn(ownerDeleteWaitlistEntry);

  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await list();
      setEntries(res.entries);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const roles = useMemo(
    () => Array.from(new Set(entries.map((e) => e.role).filter(Boolean))).sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (roleFilter !== "all" && e.role !== roleFilter) return false;
      if (!q) return true;
      const hay = `${e.full_name ?? ""} ${e.first_name ?? ""} ${e.last_name ?? ""} ${e.email} ${e.organization ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [entries, search, statusFilter, roleFilter]);

  function exportCSV() {
    const headers = [
      "email",
      "full_name",
      "role",
      "organization",
      "state",
      "city",
      "interest_area",
      "status",
      "source",
      "created_at",
    ];
    const rows = filtered.map((e) =>
      headers
        .map((h) => {
          const v = (e as any)[h] ?? "";
          return `"${String(v).replace(/"/g, '""')}"`;
        })
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function setStatus(id: string, status: WaitlistStatus) {
    try {
      await update({ data: { id, status } });
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
      toast.success("Status updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this waitlist entry? This cannot be undone.")) return;
    try {
      await del({ data: { id } });
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (openId === id) setOpenId(null);
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <OwnerShell
      title="Waitlist"
      description={`${entries.length} total entries`}
      actions={
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filtered.length}>
          Export CSV
        </Button>
      }
    >
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, organization…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {WAITLIST_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No entries match your filters.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Name / Email</th>
                  <th className="px-3 py-2.5 font-medium">Role</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Submitted</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">
                        {e.full_name || `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">{e.email}</div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{e.role}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={STATUS_COLORS[e.status]}>{e.status}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setOpenId(e.id)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {openId && (
        <WaitlistDetailDrawer
          id={openId}
          onClose={() => setOpenId(null)}
          onStatusChange={(s) => setStatus(openId, s)}
          onDelete={() => handleDelete(openId)}
        />
      )}
    </OwnerShell>
  );
}

function WaitlistDetailDrawer({
  id,
  onClose,
  onStatusChange,
  onDelete,
}: {
  id: string;
  onClose: () => void;
  onStatusChange: (s: WaitlistStatus) => void;
  onDelete: () => void;
}) {
  const getEntry = useServerFn(ownerGetWaitlistEntry);
  const addNote = useServerFn(ownerAddWaitlistNote);
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [notes, setNotes] = useState<WaitlistNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await getEntry({ data: { id } });
      setEntry(res.entry);
      setNotes(res.notes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [id]);

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      await addNote({ data: { waitlist_entry_id: id, note: newNote.trim() } });
      setNewNote("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Waitlist entry">
      <button type="button" aria-label="Close panel" className="flex-1 bg-foreground/30" onClick={onClose} />
      <aside className="flex w-full max-w-xl flex-col overflow-y-auto bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-medium">Waitlist entry</h2>
          <button type="button" aria-label="Close panel" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        {loading || !entry ? (
          <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-5 p-5">
            <div>
              <h3 className="text-base font-semibold">
                {entry.full_name ||
                  `${entry.first_name ?? ""} ${entry.last_name ?? ""}`.trim() ||
                  "—"}
              </h3>
              <a
                href={`mailto:${entry.email}`}
                className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Mail className="h-3.5 w-3.5" /> {entry.email}
              </a>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Field label="Interest type" value={entry.interest_type} />
              <Field label="Role" value={entry.role} />
              <Field label="Organization" value={entry.organization_name ?? entry.organization} />
              <Field label="District" value={entry.district_name} />
              <Field label="School" value={entry.school_name} />
              <Field label="Org type" value={entry.organization_type} />
              <Field label="City" value={entry.city} />
              <Field label="State" value={entry.state} />
              <Field label="Grade band" value={entry.student_grade_band} />
              <Field label="Source" value={entry.source || entry.source_page} />
              <Field
                label="Submitted"
                value={new Date(entry.created_at).toLocaleString()}
              />
            </dl>

            {entry.intended_use && (
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Intended use
                </div>
                <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
                  {entry.intended_use}
                </p>
              </div>
            )}

            {entry.reason && (
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Message
                </div>
                <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
                  {entry.reason}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </span>
              <Select
                value={entry.status}
                onValueChange={(v) => onStatusChange(v as WaitlistStatus)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WAITLIST_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Internal notes
              </div>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add an internal note…"
                rows={3}
              />
              <Button
                size="sm"
                className="mt-2"
                onClick={handleAddNote}
                disabled={saving || !newNote.trim()}
              >
                {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Add note
              </Button>

              <ul className="mt-4 space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-md border border-border bg-muted/20 p-3 text-sm">
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>{n.admin_name || "Admin"}</span>
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{n.note}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <ConvertToInvitationButton entry={entry} />
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete entry
              </Button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function ConvertToInvitationButton({ entry }: { entry: WaitlistEntry }) {
  const convert = useServerFn(convertWaitlistToInvitation);
  const [busy, setBusy] = useState(false);

  const roleMap: Record<string, { role: string; type: string }> = {
    parent: { role: "parent", type: "connect_to_student" },
    family: { role: "parent", type: "connect_to_student" },
    student: { role: "student", type: "connect_to_student" },
    educator: { role: "educator", type: "join_school" },
    administrator: { role: "school_admin", type: "join_school" },
    district: { role: "district_admin", type: "join_district" },
    partner: { role: "partner", type: "join_partner_org" },
  };
  const mapped = roleMap[entry.role ?? ""] ?? { role: "educator", type: "join_school" };

  async function handle() {
    setBusy(true);
    try {
      const r = await convert({
        data: {
          waitlist_id: entry.id,
          invited_role: mapped.role as never,
          invitation_type: mapped.type as never,
          expires_in_days: 14,
        },
      });
      const url = `${window.location.origin}/invite/${r.invitation.token}`;
      await navigator.clipboard?.writeText(url).catch(() => {});
      toast.success("Invitation created — link copied to clipboard.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" onClick={handle} disabled={busy}>
      {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Mail className="mr-1.5 h-3.5 w-3.5" />}
      Convert to invitation
    </Button>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || <span className="text-muted-foreground">—</span>}</dd>
    </>
  );
}
