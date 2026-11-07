import { useAuth } from "@/hooks/use-auth";
import {
  outreachInputSchema,
  outreachRowSchema,
  type OutreachRow,
} from "@/lib/validation/outreach-contract";
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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

  const { user, loading: authLoading } = useAuth();
  const scopeRef = useRef({ viewer: user?.id, loading: authLoading });
  if (scopeRef.current.viewer !== user?.id || scopeRef.current.loading !== authLoading)
    scopeRef.current = { viewer: user?.id, loading: authLoading };
  const scope = scopeRef.current;
  const mounted = useRef(true),
    readToken = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = () => mounted.current && scopeRef.current === scope && !!user && !authLoading;
  const [storedRows, setRows] = useState<OutreachRow[]>([]);
  const [readScope, setReadScope] = useState<typeof scope | null>(null);
  const [readError, setReadError] = useState<typeof scope | null>(null);
  const rows = current() && readScope === scope && readError !== scope ? storedRows : [];
  const locks = useRef({ scope, keys: new Set<string>() });
  if (locks.current.scope !== scope) locks.current = { scope, keys: new Set() };
  const [pending, setPending] = useState(new Set<string>());
  function acquire(key: string) {
    if (!current() || locks.current.keys.has(key)) return null;
    const held = locks.current;
    held.keys.add(key);
    setPending(new Set(held.keys));
    return held;
  }
  function release(held: typeof locks.current, key: string) {
    held.keys.delete(key);
    if (current()) setPending(new Set(held.keys));
  }
  function savedRow(value: unknown, input: ReturnType<typeof outreachInputSchema.parse>) {
    const row = outreachRowSchema.parse(value);
    if (input.id && row.id !== input.id) throw new Error("Saved contact mismatch.");
    const { id, expected_viewer_id, expected_updated_at, ...fields } = input;
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      const recorded = row[key as keyof OutreachRow];
      if (
        key.endsWith("_at") &&
        value !== null &&
        recorded !== null &&
        Date.parse(String(value)) === Date.parse(String(recorded))
      )
        continue;
      if (recorded !== value) throw new Error("Saved contact mismatch.");
    }
    return row;
  }
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

  async function reload() {
    if (!current()) return;
    const token = ++readToken.current;
    setLoading(true);
    setReadError(null);
    try {
      const result = await list({ data: { expected_viewer_id: user!.id } });
      if (!current() || token !== readToken.current) return;
      const parsed = z.array(outreachRowSchema).parse(result.rows);
      if (new Set(parsed.map((row) => row.id)).size !== parsed.length)
        throw new Error("Contact list mismatch.");
      setRows(parsed);
      setReadScope(scope);
    } catch {
      if (current() && token === readToken.current) {
        setRows([]);
        setReadScope(scope);
        setReadError(scope);
      }
    } finally {
      if (current() && token === readToken.current) setLoading(false);
    }
  }
  useEffect(() => {
    setRows([]);
    setReadScope(null);
    setReadError(null);
    setAdding(false);
    setPending(new Set());
    setForm({ contact_name: "", organization: "", role_type: "", email: "", phone: "", notes: "" });
    if (current()) void reload();
    else setLoading(false);
  }, [scope]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (statusF === "all" || r.outreach_status === statusF) &&
          (roleF === "all" || r.role_type === roleF),
      ),
    [rows, statusF, roleF],
  );

  async function update(id: string, patch: Partial<OutreachRow>) {
    const orig = rows.find((r) => r.id === id);
    if (!orig || readError === scope || loading) return;
    const held = acquire(id);
    if (!held) return;
    try {
      const input = outreachInputSchema.parse({
        id,
        contact_name: orig.contact_name,
        ...patch,
        expected_updated_at: orig.updated_at,
        expected_viewer_id: user!.id,
      });
      const result = await upsert({ data: input });
      if (!current()) return;
      const row = savedRow(result.row, input);
      setRows((previous) => previous.map((r) => (r.id === id ? row : r)));
    } catch {
      if (current())
        toast.error(
          "We couldn't confirm this contact change. Your text is kept. Reload contacts before trying again.",
        );
    } finally {
      release(held, id);
    }
  }
  async function add() {
    if (loading || readScope !== scope || readError === scope) return;
    if (!form.contact_name.trim()) {
      toast.error("Contact name is required.");
      return;
    }
    const held = acquire("add");
    if (!held) return;
    try {
      const input = outreachInputSchema.parse({ ...form, expected_viewer_id: user!.id });
      const result = await upsert({ data: input });
      if (!current()) return;
      const row = savedRow(result.row, input);
      setRows((previous) => [row, ...previous.filter((r) => r.id !== row.id)]);
      setAdding(false);
      setForm({
        contact_name: "",
        organization: "",
        role_type: "",
        email: "",
        phone: "",
        notes: "",
      });
    } catch {
      if (current())
        toast.error(
          "We couldn't confirm this contact was saved. Your draft is kept. Check existing contacts before trying again.",
        );
    } finally {
      release(held, "add");
    }
  }
  async function remove(id: string) {
    const orig = rows.find((row) => row.id === id);
    if (
      !current() ||
      loading ||
      !orig ||
      locks.current.keys.has(id) ||
      !confirm("Delete this outreach contact?")
    )
      return;
    const held = acquire(id);
    if (!held) return;
    try {
      const result = await del({
        data: { id, expected_updated_at: orig.updated_at, expected_viewer_id: user!.id },
      });
      if (!current()) return;
      if (result.ok !== true || result.id !== id) throw new Error("Deletion unconfirmed.");
      setRows((previous) => previous.filter((row) => row.id !== id));
    } catch {
      if (current())
        toast.error(
          "We couldn't confirm this contact was deleted. Reload contacts before trying again.",
        );
    } finally {
      release(held, id);
    }
  }

  return (
    <OwnerShell
      title="Pilot Outreach"
      description={
        readError === scope
          ? "Outreach contacts are unavailable."
          : readScope === scope
            ? `${rows.length} contacts`
            : "Loading outreach contacts…"
      }
      actions={
        <Button
          size="sm"
          disabled={
            !current() ||
            loading ||
            readScope !== scope ||
            readError === scope ||
            pending.has("add")
          }
          onClick={() => setAdding((v) => !v)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> {adding ? "Cancel" : "Add contact"}
        </Button>
      }
    >
      <div className="mb-3">
        <Button
          size="sm"
          variant="outline"
          disabled={!current() || loading || pending.size > 0}
          onClick={() => void reload()}
        >
          {readError === scope ? "Reload Contacts" : "Refresh Contacts"}
        </Button>
      </div>
      {adding && current() && readScope === scope && (
        <div className="mb-4 grid gap-2 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
          <Input
            placeholder="Contact name"
            disabled={pending.has("add")}
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          />
          <Input
            placeholder="Organization"
            disabled={pending.has("add")}
            value={form.organization}
            onChange={(e) => setForm({ ...form, organization: e.target.value })}
          />
          <Select
            value={form.role_type}
            disabled={pending.has("add")}
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
            disabled={pending.has("add")}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            placeholder="Phone"
            disabled={pending.has("add")}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Textarea
            className="sm:col-span-2"
            placeholder="Notes / relationship"
            disabled={pending.has("add")}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Button size="sm" disabled={pending.has("add")} onClick={() => void add()}>
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

      {readError === scope ? (
        <p role="alert" className="rounded-lg border p-4 text-sm">
          We couldn't load outreach contacts. Reload them to try again.
        </p>
      ) : loading || readScope !== scope ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-background p-6 text-sm text-muted-foreground">
          {rows.length ? "No contacts match these filters." : "No outreach contacts."}
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
                  disabled={loading || pending.has(r.id)}
                  onValueChange={(value) => {
                    const status = outreachRowSchema.shape.outreach_status.safeParse(value);
                    if (status.success) void update(r.id, { outreach_status: status.data });
                  }}
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
                  aria-label={`Follow-Up for ${r.contact_name}`}
                  disabled={loading || pending.has(r.id)}
                  className="h-8 w-[200px] text-xs"
                  defaultValue={r.next_follow_up_at ? localInputValue(r.next_follow_up_at) : ""}
                  onBlur={(e) => {
                    const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                    if (
                      (v ? Date.parse(v) : null) !==
                      (r.next_follow_up_at ? Date.parse(r.next_follow_up_at) : null)
                    )
                      void update(r.id, { next_follow_up_at: v });
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${r.contact_name}`}
                  disabled={loading || pending.has(r.id)}
                  onClick={() => void remove(r.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea
                rows={2}
                className="mt-2"
                placeholder="Notes"
                aria-label={`Notes for ${r.contact_name}`}
                disabled={loading || pending.has(r.id)}
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

function localInputValue(value: string) {
  const date = new Date(value),
    pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
