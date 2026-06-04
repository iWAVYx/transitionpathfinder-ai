import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, ShieldX, Clock, ExternalLink, Building2 } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  platformListOrganizations,
  platformDecideOrganization,
  type OrgRow,
} from "@/lib/owner/platform-admin.functions";

export const Route = createFileRoute("/_authenticated/owner/organizations")({
  head: () => ({ meta: [{ title: "Organizations — Admin Hub" }] }),
  component: OrganizationsPage,
});

function StatusBadge({ status }: { status: string }) {
  if (status === "verified")
    return (
      <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
        <ShieldCheck className="mr-1 h-3 w-3" /> Verified
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="destructive">
        <ShieldX className="mr-1 h-3 w-3" /> Rejected
      </Badge>
    );
  return (
    <Badge variant="secondary">
      <Clock className="mr-1 h-3 w-3" /> Pending
    </Badge>
  );
}

function OrganizationsPage() {
  const list = useServerFn(platformListOrganizations);
  const decide = useServerFn(platformDecideOrganization);
  const [orgs, setOrgs] = useState<OrgRow[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "verified" | "rejected" | "all">("pending");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => {
    setOrgs(null);
    list().then((r) => setOrgs(r.organizations)).catch(() => setOrgs([]));
  };
  useEffect(refresh, [list]);

  const filtered = (orgs ?? []).filter((o) => {
    if (filter !== "all" && o.verified_status !== filter) return false;
    if (search && !`${o.name} ${o.city ?? ""} ${o.contact_email ?? ""}`.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  async function onDecide(id: string, decision: "verified" | "rejected" | "pending") {
    setBusy(id);
    try {
      await decide({ data: { id, decision } });
      toast.success(`Organization ${decision}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <OwnerShell
      title="Organizations"
      description="Verify schools, districts, and partner organizations on the platform."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["pending", "verified", "rejected", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
        <Input
          placeholder="Search by name, city, email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {orgs === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Building2 className="mx-auto mb-2 h-6 w-6" />
          No organizations match this view.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Organization</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Members</th>
                <th className="px-4 py-2">Opportunities</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{o.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {o.contact_email && <span>{o.contact_email}</span>}
                      {o.website && (
                        <a
                          href={o.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Website <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 capitalize">{o.type}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {[o.city, o.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2.5">{o.member_count}</td>
                  <td className="px-4 py-2.5">{o.opportunity_count}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={o.verified_status} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      {o.verified_status !== "verified" && (
                        <Button
                          size="sm"
                          variant="default"
                          disabled={busy === o.id}
                          onClick={() => onDecide(o.id, "verified")}
                        >
                          Verify
                        </Button>
                      )}
                      {o.verified_status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === o.id}
                          onClick={() => onDecide(o.id, "rejected")}
                        >
                          Reject
                        </Button>
                      )}
                      {o.verified_status !== "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === o.id}
                          onClick={() => onDecide(o.id, "pending")}
                        >
                          Reset
                        </Button>
                      )}
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
