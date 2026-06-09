import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listOutreach,
  upsertOutreach,
  deleteOutreach,
} from "@/lib/validation/validation.functions";

export const Route = createFileRoute("/_authenticated/owner/outreach")({
  head: () => ({ meta: [{ title: "Pilot Outreach — Admin Hub" }] }),
  component: Page,
});

const STATUSES = [
  "not_contacted",
  "contacted",
  "meeting_scheduled",
  "demo_completed",
  "interested",
  "not_interested",
  "follow_up_needed",
] as const;

const ROLES = [
  "Parent/Guardian",
  "Special Education Teacher",
  "Educator / Case Manager",
  "School Counselor",
  "Transition Coordinator",
  "School Administrator",
  "School District Administrator",
  "Parent Advocate",
  "Disability Provider",
  "Workforce / Training Program",
  "Partner Organization",
  "Investor / Funder",
  "Community Organization",
];

function Page() {
  const list = useServerFn(listOutreach);
  const upsert = useServerFn(upsertOutreach);
  const del = useServerFn(deleteOutreach);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState("all");
  const [roleF, setRoleF] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    contact_name: "",
    organization: "",
    role_type: "",
    email: "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    list()
      .then((r) => setRows(r.rows))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (statusF === "all" || r.outreach_status === statusF) &&
          (roleF === "all" || r.role_type === roleF),
      ),
    [rows, statusF, roleF],
  );

  async function update(id: string, patch: any) {
    const orig = rows.find((r) => r.id === id);
    if (!orig) return;
    try {
      const { row } = await upsert({ data: { ...orig, ...patch } });
      setRows((p) => p.map((r) => (r.id === id ? row : r)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function add() {
    if (!form.contact_name.trim()) return toast.error("Name required");
    try {
      const { row } = await upsert({ data: form as any });
      setRows((p) => [row, ...p]);
      setAdding(false);
      setForm({
        contact_name: "",
        organization: "",
        role_type: "",
        email: "",
        phone: "",
        notes: "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    try {
      await del({ data: { id } });
      setRows((p) => p.filter((r) => r.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <OwnerShell
      title="Pilot Outreach"
      description={`${rows.length} contacts`}
      actions={
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> {adding ? "Cancel" : "Add contact"}
        </Button>
      }
    >
      {adding && (
        <div className="mb-4 grid gap-2 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
          <Input
            placeholder="Contact name"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          />
          <Input
            placeholder="Organization"
            value={form.organization}
            onChange={(e) => setForm({ ...form, organization: e.target.value })}
          />
          <Select
            value={form.role_type}
            onValueChange={(v) => setForm({ ...form, role_type: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Role / category" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Textarea
            className="sm:col-span-2"
            placeholder="Notes / relationship"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Button size="sm" onClick={add}>
              Save contact
            </Button>
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleF} onValueChange={setRoleF}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => (
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
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-background p-6 text-sm text-muted-foreground">
          No outreach contacts.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-background p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-medium">{r.contact_name}</span>
                  {r.organization && (
                    <span className="ml-2 text-xs text-muted-foreground">· {r.organization}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.role_type && <Badge variant="outline">{r.role_type}</Badge>}
                  <Badge>{r.outreach_status.replace(/_/g, " ")}</Badge>
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {r.email && <span>{r.email}</span>}
                {r.phone && <span className="ml-2">· {r.phone}</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select
                  value={r.outreach_status}
                  onValueChange={(v) => update(r.id, { outreach_status: v })}
                >
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="datetime-local"
                  className="h-8 w-[200px] text-xs"
                  defaultValue={
                    r.next_follow_up_at
                      ? new Date(r.next_follow_up_at).toISOString().slice(0, 16)
                      : ""
                  }
                  onBlur={(e) => {
                    const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                    update(r.id, { next_follow_up_at: v });
                  }}
                />
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea
                rows={2}
                className="mt-2"
                placeholder="Notes"
                defaultValue={r.notes ?? ""}
                onBlur={(e) => {
                  if ((e.target.value ?? "") !== (r.notes ?? ""))
                    update(r.id, { notes: e.target.value });
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </OwnerShell>
  );
}
