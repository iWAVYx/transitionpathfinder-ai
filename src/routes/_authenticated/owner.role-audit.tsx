import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, Save } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  listRoleAuditReviews,
  updateRoleAuditReview,
  type RoleAuditReview,
  type RoleAuditReadiness,
} from "@/lib/owner/role-audit.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/owner/role-audit")({
  head: () => ({ meta: [{ title: "Role Dashboard Audit — Admin Hub" }] }),
  component: RoleAuditPage,
});

type Draft = Pick<RoleAuditReview, "purpose" | "issues_found" | "issues_fixed" | "staged_items" | "notes" | "readiness">;

const READINESS_OPTIONS: { value: RoleAuditReadiness; label: string }[] = [
  { value: "ready", label: "Ready" },
  { value: "needs_review", label: "Needs review" },
  { value: "staged", label: "Staged" },
  { value: "blocked", label: "Blocked" },
];

const READINESS_VARIANT: Record<RoleAuditReadiness, "default" | "secondary" | "outline" | "destructive"> = {
  ready: "default",
  needs_review: "outline",
  staged: "secondary",
  blocked: "destructive",
};

function RoleAuditPage() {
  const list = useServerFn(listRoleAuditReviews);
  const save = useServerFn(updateRoleAuditReview);
  const [rows, setRows] = useState<RoleAuditReview[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    list()
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        const next: Record<string, Draft> = {};
        for (const r of data) {
          next[r.id] = {
            purpose: r.purpose,
            issues_found: r.issues_found,
            issues_fixed: r.issues_fixed,
            staged_items: r.staged_items,
            notes: r.notes,
            readiness: r.readiness,
          };
        }
        setDrafts(next);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load audit");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [list]);

  function patchDraft(id: string, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  async function handleSave(row: RoleAuditReview, markReviewed: boolean) {
    setSavingId(row.id);
    try {
      const updated = await save({ data: { id: row.id, ...drafts[row.id], mark_reviewed: markReviewed } });
      setRows((rs) => rs?.map((r) => (r.id === row.id ? updated : r)) ?? rs);
      toast.success(markReviewed ? `Marked ${updated.role_label} as reviewed` : `Saved ${updated.role_label}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <OwnerShell
      title="Role Dashboard Audit"
      description="One row per signed-in role. Track what each dashboard must support, what was found, what was fixed, and what is still staged."
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading audit…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !rows || rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No audit rows yet. The migration seeds one row per role — re-run if this list is empty.
        </p>
      ) : (
        <div className="space-y-6">
          {rows.map((row) => {
            const draft = drafts[row.id];
            const reviewed = !!row.last_reviewed_at;
            return (
              <section
                key={row.id}
                className="rounded-2xl border border-border bg-background p-4 sm:p-6"
              >
                <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-medium tracking-tight">{row.role_label}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Key: <code>{row.role_key}</code>
                      {reviewed && (
                        <>
                          {" · Last reviewed "}
                          {new Date(row.last_reviewed_at!).toLocaleString()}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={READINESS_VARIANT[row.readiness] ?? "outline"}>
                      {READINESS_OPTIONS.find((o) => o.value === row.readiness)?.label ?? row.readiness}
                    </Badge>
                    <Badge variant={reviewed ? "secondary" : "outline"}>
                      {reviewed ? "Reviewed" : "Pending review"}
                    </Badge>
                  </div>
                </header>

                <div className="mb-4 flex flex-wrap items-end gap-3">
                  <div className="w-full sm:w-56">
                    <Label className="text-xs font-medium text-muted-foreground">Readiness</Label>
                    <Select
                      value={draft?.readiness ?? row.readiness}
                      onValueChange={(v) => patchDraft(row.id, { readiness: v as RoleAuditReadiness })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {READINESS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field
                    label="Purpose (what this role must accomplish)"
                    value={draft?.purpose ?? ""}
                    onChange={(v) => patchDraft(row.id, { purpose: v })}
                    rows={4}
                  />
                  <Field
                    label="Issues found"
                    value={draft?.issues_found ?? ""}
                    onChange={(v) => patchDraft(row.id, { issues_found: v })}
                    rows={4}
                  />
                  <Field
                    label="Issues fixed"
                    value={draft?.issues_fixed ?? ""}
                    onChange={(v) => patchDraft(row.id, { issues_fixed: v })}
                    rows={4}
                  />
                  <Field
                    label="Staged items (deferred)"
                    value={draft?.staged_items ?? ""}
                    onChange={(v) => patchDraft(row.id, { staged_items: v })}
                    rows={4}
                  />
                  <div className="lg:col-span-2">
                    <Field
                      label="Notes"
                      value={draft?.notes ?? ""}
                      onChange={(v) => patchDraft(row.id, { notes: v })}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave(row, false)}
                    disabled={savingId === row.id}
                  >
                    {savingId === row.id ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-3.5 w-3.5" />
                    )}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave(row, true)}
                    disabled={savingId === row.id}
                  >
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                    Save & mark reviewed
                  </Button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </OwnerShell>
  );
}

function Field({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1.5 text-sm"
      />
    </div>
  );
}
