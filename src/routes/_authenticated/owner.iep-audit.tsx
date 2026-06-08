import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Search, ShieldAlert, Sparkles } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchIepAuditLog, type IepAuditEntry } from "@/lib/iep-audit.functions";

export const Route = createFileRoute("/_authenticated/owner/iep-audit")({
  head: () => ({ meta: [{ title: "IEP Signed-URL Audit — Admin Hub" }] }),
  component: IepAuditPage,
});

type RoleFilter = "any" | "owner" | "editor" | "viewer" | "admin" | "other";
type ActionFilter = "any" | "document.signed_url.mint" | "document.signed_url.denied";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toIsoOrNull(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: IepAuditEntry[]): string {
  const headers = [
    "created_at",
    "action",
    "role",
    "actor_id",
    "actor_email",
    "student_id",
    "document_id",
    "doc_type",
    "title",
    "ttl_seconds",
    "storage_path",
    "reason",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      headers
        .map((h) => csvEscape((r as unknown as Record<string, unknown>)[h]))
        .join(","),
    );
  }
  return lines.join("\n");
}

function IepAuditPage() {
  const run = useServerFn(searchIepAuditLog);

  const [role, setRole] = useState<RoleFilter>("any");
  const [action, setAction] = useState<ActionFilter>("any");
  const [studentId, setStudentId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(500);

  const [entries, setEntries] = useState<IepAuditEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentIdValid = !studentId || UUID_RE.test(studentId.trim());
  const documentIdValid = !documentId || UUID_RE.test(documentId.trim());
  const canSearch = studentIdValid && documentIdValid && !loading;

  async function doSearch() {
    setLoading(true);
    setError(null);
    try {
      const res = await run({
        data: {
          role,
          action,
          student_id: studentId.trim() ? studentId.trim() : null,
          document_id: documentId.trim() ? documentId.trim() : null,
          from: toIsoOrNull(from),
          to: toIsoOrNull(to),
          limit,
        },
      });
      setEntries(res.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const list = entries ?? [];
    return {
      total: list.length,
      mints: list.filter((e) => e.action === "document.signed_url.mint").length,
      denied: list.filter((e) => e.action === "document.signed_url.denied").length,
    };
  }, [entries]);

  function exportCsv() {
    if (!entries || entries.length === 0) return;
    const csv = toCsv(entries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iep-audit-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <OwnerShell
      title="IEP signed-URL audit"
      description="Search and export every IEP PDF signed-URL mint and revoked-access denial."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={!entries || entries.length === 0}
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      }
    >
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as RoleFilter)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any role</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="admin">Platform admin</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Action</Label>
            <Select value={action} onValueChange={(v) => setAction(v as ActionFilter)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="document.signed_url.mint">Mint</SelectItem>
                <SelectItem value="document.signed_url.denied">Denied (revoked)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Student ID (UUID)</Label>
            <Input
              className="mt-1"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="optional"
            />
            {!studentIdValid && (
              <p className="mt-1 text-xs text-destructive">Invalid UUID</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Document ID (UUID)</Label>
            <Input
              className="mt-1"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder="optional"
            />
            {!documentIdValid && (
              <p className="mt-1 text-xs text-destructive">Invalid UUID</p>
            )}
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Input
              className="mt-1"
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input
              className="mt-1"
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Limit</Label>
            <Input
              className="mt-1"
              type="number"
              min={1}
              max={2000}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(2000, Number(e.target.value) || 500)))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={doSearch} disabled={!canSearch} className="w-full">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Results" value={counts.total} />
        <Stat label="Signed URLs minted" value={counts.mints} icon={<Sparkles className="h-4 w-4" />} />
        <Stat label="Revoked-access denials" value={counts.denied} tone="alert" icon={<ShieldAlert className="h-4 w-4" />} />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background">
        {error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : entries === null || loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : entries.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No matching audit entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Document</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr key={e.id} className={e.action === "document.signed_url.denied" ? "bg-destructive/5" : ""}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {e.action === "document.signed_url.denied" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                          <ShieldAlert className="h-3 w-3" /> Denied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                          Mint
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs capitalize">{e.role ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      <div>{e.actor_email ?? "—"}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {e.actor_id ? e.actor_id.slice(0, 8) : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {e.student_id ? e.student_id.slice(0, 8) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {e.document_id ? e.document_id.slice(0, 8) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div>{e.title ?? ""}</div>
                      <div className="text-muted-foreground">
                        {[e.doc_type, e.ttl_seconds ? `${e.ttl_seconds}s` : null, e.reason]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </OwnerShell>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  tone?: "alert";
}) {
  return (
    <div
      className={
        "flex items-center justify-between rounded-lg border p-4 " +
        (tone === "alert" ? "border-destructive/30 bg-destructive/5" : "border-border bg-background")
      }
    >
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl">{value}</p>
      </div>
      {icon && (
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </span>
      )}
    </div>
  );
}
