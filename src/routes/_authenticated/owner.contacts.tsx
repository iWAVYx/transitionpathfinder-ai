import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Trash2, Mail, X } from "lucide-react";
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
  ownerListContacts,
  ownerUpdateContact,
  ownerDeleteContact,
  CONTACT_STATUSES,
  type ContactSubmission,
  type ContactStatus,
} from "@/lib/owner/owner.functions";

export const Route = createFileRoute("/_authenticated/owner/contacts")({
  head: () => ({ meta: [{ title: "Contact forms — Admin Hub" }] }),
  component: ContactsPage,
});

const STATUS_COLORS: Record<ContactStatus, "default" | "secondary" | "outline"> = {
  new: "default",
  reviewed: "secondary",
  replied: "secondary",
  archived: "outline",
};

function ContactsPage() {
  const list = useServerFn(ownerListContacts);
  const update = useServerFn(ownerUpdateContact);
  const del = useServerFn(ownerDeleteContact);

  const [items, setItems] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    list()
      .then((r) => setItems(r.submissions))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (!q) return true;
      return `${i.first_name} ${i.last_name ?? ""} ${i.email} ${i.organization ?? ""} ${i.message}`
        .toLowerCase()
        .includes(q);
    });
  }, [items, search, statusFilter]);

  const open = items.find((i) => i.id === openId);

  async function setStatus(id: string, status: ContactStatus) {
    try {
      await update({ data: { id, status } });
      setItems((p) => p.map((i) => (i.id === id ? { ...i, status } : i)));
      toast.success("Updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function saveNotes(id: string, internal_notes: string) {
    try {
      await update({ data: { id, internal_notes } });
      setItems((p) => p.map((i) => (i.id === id ? { ...i, internal_notes } : i)));
      toast.success("Notes saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this submission?")) return;
    try {
      await del({ data: { id } });
      setItems((p) => p.filter((i) => i.id !== id));
      setOpenId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <OwnerShell
      title="Contact form submissions"
      description={`${items.length} total submissions`}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, message…"
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
            {CONTACT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
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
            <p className="p-6 text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((i) => (
                <li
                  key={i.id}
                  className="cursor-pointer px-4 py-3 hover:bg-muted/30"
                  onClick={() => setOpenId(i.id)}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <span className="font-medium">
                        {i.first_name} {i.last_name ?? ""}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">{i.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_COLORS[i.status]}>{i.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(i.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{i.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open && (
        <ContactDrawer
          item={open}
          onClose={() => setOpenId(null)}
          onStatusChange={(s) => setStatus(open.id, s)}
          onSaveNotes={(n) => saveNotes(open.id, n)}
          onDelete={() => handleDelete(open.id)}
        />
      )}
    </OwnerShell>
  );
}

function ContactDrawer({
  item,
  onClose,
  onStatusChange,
  onSaveNotes,
  onDelete,
}: {
  item: ContactSubmission;
  onClose: () => void;
  onStatusChange: (s: ContactStatus) => void;
  onSaveNotes: (n: string) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(item.internal_notes ?? "");
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Submission details">
      <button type="button" aria-label="Close panel" className="flex-1 bg-foreground/30" onClick={onClose} />
      <aside className="flex w-full max-w-xl flex-col overflow-y-auto bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-medium">Submission</h2>
          <button type="button" aria-label="Close panel" onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="space-y-5 p-5">
          <div>
            <h3 className="text-base font-semibold">
              {item.first_name} {item.last_name ?? ""}
            </h3>
            <a
              href={`mailto:${item.email}`}
              className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Mail className="h-3.5 w-3.5" /> {item.email}
            </a>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-xs uppercase text-muted-foreground">Phone</dt>
            <dd>{item.phone || "—"}</dd>
            <dt className="text-xs uppercase text-muted-foreground">Organization</dt>
            <dd>{item.organization || "—"}</dd>
            <dt className="text-xs uppercase text-muted-foreground">Type</dt>
            <dd>{item.inquiry_type}</dd>
            <dt className="text-xs uppercase text-muted-foreground">Source page</dt>
            <dd className="truncate">{item.source_page || "—"}</dd>
            <dt className="text-xs uppercase text-muted-foreground">Submitted</dt>
            <dd>{new Date(item.created_at).toLocaleString()}</dd>
          </dl>
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">Message</div>
            <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
              {item.message}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase text-muted-foreground">Status</span>
            <Select
              value={item.status}
              onValueChange={(v) => onStatusChange(v as ContactStatus)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="mb-2 text-xs uppercase text-muted-foreground">Internal notes</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            <Button size="sm" className="mt-2" onClick={() => onSaveNotes(notes)}>
              Save notes
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
