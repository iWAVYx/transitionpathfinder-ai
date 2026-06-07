import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Download, Plus, Pencil, Database, Eye } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getImportAudit,
  type ImportAuditResult,
  type ImportAuditPartner,
  type ImportAuditOpportunity,
} from "@/lib/import-audit.functions";

export const Route = createFileRoute("/_authenticated/owner/import-audit")({
  head: () => ({ meta: [{ title: "CT Seed Import Audit — Admin Hub" }] }),
  component: ImportAuditPage,
});

const DEFAULT_SINCE = "2026-06-07T00:00:00Z";

function escapeCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, header: string[], rows: (string | null | undefined)[][]) {
  const csv = [header, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmt(d: string) {
  return new Date(d).toLocaleString();
}

function OpBadge({ op }: { op: "created" | "updated" }) {
  return op === "created" ? (
    <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
      <Plus className="mr-1 h-3 w-3" /> Created
    </Badge>
  ) : (
    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
      <Pencil className="mr-1 h-3 w-3" /> Updated
    </Badge>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl">{value}</div>
    </div>
  );
}

function ImportAuditPage() {
  const fetchAudit = useServerFn(getImportAudit);
  const [since, setSince] = useState(DEFAULT_SINCE);
  const [data, setData] = useState<ImportAuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [opFilter, setOpFilter] = useState<"all" | "created" | "updated">("all");

  const refresh = () => {
    setLoading(true);
    fetchAudit({ data: { since } })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, [fetchAudit, since]);

  const filteredPartners: ImportAuditPartner[] = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.partners.filter((p) => {
      if (opFilter !== "all" && p.operation !== opFilter) return false;
      if (!q) return true;
      return (
        p.organization_name.toLowerCase().includes(q) ||
        (p.city ?? "").toLowerCase().includes(q) ||
        p.collection_tags.join(" ").toLowerCase().includes(q)
      );
    });
  }, [data, search, opFilter]);

  const filteredOpps: ImportAuditOpportunity[] = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.opportunities.filter((o) => {
      if (opFilter !== "all" && o.operation !== opFilter) return false;
      if (!q) return true;
      return (
        o.opportunity_title.toLowerCase().includes(q) ||
        (o.partner_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, opFilter]);

  const exportPartners = () => {
    downloadCsv(
      `ct-seed-partners-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Operation",
        "Organization",
        "Type",
        "Verification",
        "Outreach",
        "City",
        "County",
        "Tags",
        "Created At",
        "Updated At",
        "ID",
      ],
      filteredPartners.map((p) => [
        p.operation,
        p.organization_name,
        p.partner_type ?? "",
        p.verification_status ?? "",
        p.outreach_status ?? "",
        p.city ?? "",
        p.county ?? "",
        p.collection_tags.join("; "),
        p.created_at,
        p.updated_at,
        p.id,
      ]),
    );
  };

  const exportOpps = () => {
    downloadCsv(
      `ct-seed-opportunities-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Operation",
        "Opportunity",
        "Type",
        "Status",
        "Partner",
        "Partner Tags",
        "Created At",
        "Updated At",
        "ID",
      ],
      filteredOpps.map((o) => [
        o.operation,
        o.opportunity_title,
        o.opportunity_type ?? "",
        o.status ?? "",
        o.partner_name ?? "",
        o.partner_tags.join("; "),
        o.created_at,
        o.updated_at,
        o.id,
      ]),
    );
  };

  return (
    <OwnerShell
      title="CT Seed Import Audit"
      description="Records added or updated by the Connecticut Partner Network seed expansion, scoped to CT seed collection tags."
    >
      {loading || !data ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading audit…
        </div>
      ) : !data.is_admin ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Admin access required.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Since</label>
              <Input
                type="datetime-local"
                value={since.slice(0, 16)}
                onChange={(e) => setSince(new Date(e.target.value).toISOString())}
                className="w-56"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Operation</label>
              <div className="flex gap-1.5">
                {(["all", "created", "updated"] as const).map((o) => (
                  <Button
                    key={o}
                    size="sm"
                    variant={opFilter === o ? "default" : "outline"}
                    onClick={() => setOpFilter(o)}
                  >
                    {o.charAt(0).toUpperCase() + o.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">Search</label>
              <Input
                placeholder="Filter by name, city, tag…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Button variant="outline" onClick={refresh}>
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Partners Total" value={data.totals.partners_total} />
            <StatCard label="Partners Created" value={data.totals.partners_created} />
            <StatCard label="Partners Updated" value={data.totals.partners_updated} />
            <StatCard label="Opportunities Total" value={data.totals.opportunities_total} />
            <StatCard label="Opportunities Created" value={data.totals.opportunities_created} />
            <StatCard label="Opportunities Updated" value={data.totals.opportunities_updated} />
          </div>

          {/* Partners table */}
          <section className="rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-medium">
                  Partner Organizations ({filteredPartners.length})
                </h2>
              </div>
              <Button size="sm" variant="outline" onClick={exportPartners} disabled={!filteredPartners.length}>
                <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Op</th>
                    <th className="px-4 py-2">Organization</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Verification</th>
                    <th className="px-4 py-2">Outreach</th>
                    <th className="px-4 py-2">Location</th>
                    <th className="px-4 py-2">Seed Tags</th>
                    <th className="px-4 py-2">Updated</th>
                    <th className="px-4 py-2 text-right">Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPartners.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        No partners match this view.
                      </td>
                    </tr>
                  ) : (
                    filteredPartners.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2"><OpBadge op={p.operation} /></td>
                        <td className="px-4 py-2 font-medium">{p.organization_name}</td>
                        <td className="px-4 py-2 capitalize text-muted-foreground">
                          {p.partner_type ?? "—"}
                        </td>
                        <td className="px-4 py-2 capitalize">{p.verification_status ?? "—"}</td>
                        <td className="px-4 py-2 capitalize text-muted-foreground">
                          {p.outreach_status ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {[p.city, p.county].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {p.collection_tags.slice(0, 4).map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px]">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {fmt(p.updated_at)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedPartner(p)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            {partnerChangedFields(p).length}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Opportunities table */}
          <section className="rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-medium">Opportunities ({filteredOpps.length})</h2>
              </div>
              <Button size="sm" variant="outline" onClick={exportOpps} disabled={!filteredOpps.length}>
                <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Op</th>
                    <th className="px-4 py-2">Opportunity</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Partner</th>
                    <th className="px-4 py-2">Updated</th>
                    <th className="px-4 py-2 text-right">Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOpps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No opportunities match this view.
                      </td>
                    </tr>
                  ) : (
                    filteredOpps.map((o) => (
                      <tr key={o.id}>
                        <td className="px-4 py-2"><OpBadge op={o.operation} /></td>
                        <td className="px-4 py-2 font-medium">{o.opportunity_title}</td>
                        <td className="px-4 py-2 capitalize text-muted-foreground">
                          {(o.opportunity_type ?? "—").replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-2 capitalize">{o.status ?? "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {o.partner_name ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {fmt(o.updated_at)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedOpp(o)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            {opportunityChangedFields(o).length}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      <PartnerChangesDialog
        partner={selectedPartner}
        onClose={() => setSelectedPartner(null)}
      />
      <OpportunityChangesDialog
        opportunity={selectedOpp}
        onClose={() => setSelectedOpp(null)}
      />
    </OwnerShell>
  );
}
