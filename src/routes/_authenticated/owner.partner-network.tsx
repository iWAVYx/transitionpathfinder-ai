import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Star, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { listAdminPartners, setPartnerStatus } from "@/lib/partner-network.functions";

export const Route = createFileRoute("/_authenticated/owner/partner-network")({
  head: () => ({ meta: [{ title: "Partner Network — Admin Hub" }] }),
  component: PartnerNetworkAdminPage,
});

type Row = {
  id: string;
  organization_name: string;
  partner_type: string;
  county: string | null;
  city: string | null;
  verification_status: string;
  outreach_status: string;
  is_public: boolean;
  is_featured: boolean;
  collection_tags: string[];
  pathway_categories: string[];
  updated_at: string;
};

const STATUSES = ["all", "verified", "featured", "potential", "needs_review", "archived"] as const;

function PartnerNetworkAdminPage() {
  const list = useServerFn(listAdminPartners);
  const setStatus = useServerFn(setPartnerStatus);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => {
    setRows(null);
    list()
      .then((r) => setRows(r.partners as Row[]))
      .catch(() => setRows([]));
  };
  useEffect(refresh, [list]);

  const filtered = useMemo(() => {
    return (rows ?? []).filter((r) => {
      if (filter !== "all" && r.verification_status !== filter) return false;
      if (q) {
        const hay = `${r.organization_name} ${(r.collection_tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, filter, q]);

  async function update(id: string, patch: Parameters<typeof setStatus>[0]["data"]) {
    setBusy(id);
    try {
      await setStatus({ data: patch });
      toast.success("Updated");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <OwnerShell
      title="Partner Network"
      description="Verify and curate Connecticut transition partners, opportunities, and community resource leads."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={
              "rounded-full px-3 py-1 text-xs " +
              (filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70")
            }
          >
            {s}
          </button>
        ))}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search organizations…"
          className="ml-auto max-w-xs"
        />
      </div>

      {rows === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No partners match.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Organization</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Outreach</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.organization_name}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(r.pathway_categories ?? []).slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.partner_type}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {[r.city, r.county].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{r.verification_status}</Badge>
                    {r.is_featured && (
                      <Badge className="ml-1 bg-primary/15 text-primary">Featured</Badge>
                    )}
                    {!r.is_public && (
                      <Badge variant="outline" className="ml-1">
                        Hidden
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.outreach_status}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() =>
                          update(r.id, { id: r.id, verification_status: "verified" })
                        }
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() => update(r.id, { id: r.id, is_featured: !r.is_featured })}
                      >
                        <Star className="mr-1 h-3 w-3" />
                        {r.is_featured ? "Unfeature" : "Feature"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() => update(r.id, { id: r.id, is_public: !r.is_public })}
                      >
                        {r.is_public ? (
                          <>
                            <EyeOff className="mr-1 h-3 w-3" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="mr-1 h-3 w-3" />
                            Publish
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OwnerShell>
  );
}
