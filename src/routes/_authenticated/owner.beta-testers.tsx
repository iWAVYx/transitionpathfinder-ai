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
  listBetaTesters,
  upsertBetaTester,
  deleteBetaTester,
} from "@/lib/validation/validation.functions";

export const Route = createFileRoute("/_authenticated/owner/beta-testers")({
  head: () => ({ meta: [{ title: "Beta Testers — Admin Hub" }] }),
  component: Page,
});

const ROLES = [
  ["parent_guardian", "Parent / Guardian"],
  ["student", "Student"],
  ["educator_case_manager", "Educator / Case Manager"],
  ["school_admin", "School Administrator"],
  ["district_admin", "District Administrator"],
  ["partner_org", "Partner Organization"],
  ["general_reviewer", "General Reviewer"],
] as const;

const INVITE_STATUSES = ["not_invited", "invited", "accepted", "completed", "inactive"] as const;
const TEST_STATUSES = ["not_started", "in_progress", "completed", "needs_follow_up"] as const;

function Page() {
  const list = useServerFn(listBetaTesters);
  const upsert = useServerFn(upsertBetaTester);
  const del = useServerFn(deleteBetaTester);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role_type: "parent_guardian" as (typeof ROLES)[number][0],
    organization: "",
    assigned_test_script: "",
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
          (roleFilter === "all" || r.role_type === roleFilter) &&
          (statusFilter === "all" ||
            r.testing_status === statusFilter ||
            r.invitation_status === statusFilter),
      ),
    [rows, roleFilter, statusFilter],
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
    if (!form.first_name.trim() || !form.email.trim()) {
      toast.error("First name and email required");
      return;
    }
    try {
      const { row } = await upsert({ data: form as any });
      setRows((p) => [row, ...p]);
      setAdding(false);
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        role_type: "parent_guardian",
        organization: "",
        assigned_test_script: "",
        notes: "",
      });
      toast.success("Added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this tester?")) return;
    try {
      await del({ data: { id } });
      setRows((p) => p.filter((r) => r.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <OwnerShell
      title="Beta Testers"
      description={`${rows.length} testers tracked`}
      actions={
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> {adding ? "Cancel" : "Add tester"}
        </Button>
      }
    >
      {adding && (
        <div className="mb-4 grid gap-2 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
          <Input
            placeholder="First name"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
          <Input
            placeholder="Last name"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
          <Input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Select
            value={form.role_type}
            onValueChange={(v) => setForm({ ...form, role_type: v as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Organization (optional)"
            value={form.organization}
            onChange={(e) => setForm({ ...form, organization: e.target.value })}
          />
          <Input
            placeholder="Assigned test script key"
            value={form.assigned_test_script}
            onChange={(e) => setForm({ ...form, assigned_test_script: e.target.value })}
          />
          <Textarea
            className="sm:col-span-2"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Button size="sm" onClick={add}>
              Save tester
            </Button>
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {[...INVITE_STATUSES, ...TEST_STATUSES].map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
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
            <p className="p-6 text-sm text-muted-foreground">No testers match these filters.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => (
                <li key={r.id} className="space-y-2 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <span className="font-medium">
                        {r.first_name} {r.last_name ?? ""}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">{r.email}</span>
                      {r.organization && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          · {r.organization}
                        </span>
                      )}
                    </div>
                    <Badge variant="outline">
                      {ROLES.find((x) => x[0] === r.role_type)?.[1] ?? r.role_type}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={r.invitation_status}
                      onValueChange={(v) => update(r.id, { invitation_status: v })}
                    >
                      <SelectTrigger className="h-8 w-[170px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVITE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            invite: {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={r.testing_status}
                      onValueChange={(v) => update(r.id, { testing_status: v })}
                    >
                      <SelectTrigger className="h-8 w-[200px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEST_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            test: {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-8 max-w-[180px] text-xs"
                      placeholder="Assigned script"
                      defaultValue={r.assigned_test_script ?? ""}
                      onBlur={(e) => update(r.id, { assigned_test_script: e.target.value })}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(r.id)}
                      aria-label="Delete tester"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Textarea
                    rows={2}
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
        </div>
      )}
    </OwnerShell>
  );
}
