import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  listPilotPackages,
  upsertPilotPackage,
  deletePilotPackage,
} from "@/lib/validation/validation.functions";

export const Route = createFileRoute("/_authenticated/owner/pilot-packages")({
  head: () => ({ meta: [{ title: "Pilot Packages — Admin Hub" }] }),
  component: Page,
});

const SEED_AUDIENCES = [
  "Family Early Access",
  "Educator / Case Manager Pilot",
  "School Pilot",
  "District Pilot",
  "Partner Network Pilot",
];

function Page() {
  const list = useServerFn(listPilotPackages);
  const upsert = useServerFn(upsertPilotPackage);
  const del = useServerFn(deletePilotPackage);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    list()
      .then((r) => setRows(r.rows))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

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

  async function addPackage(audience: string) {
    try {
      const { row } = await upsert({
        data: {
          package_name: audience,
          audience,
          description: "",
          suggested_price_or_status: "TBD",
          public_visible: false,
        },
      });
      setRows((p) => [...p, row]);
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
      title="Pilot Packages"
      description="Internal planning for the first paid offers. Set public_visible=true to expose."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {SEED_AUDIENCES.map((a) => (
          <Button key={a} size="sm" variant="outline" onClick={() => addPackage(a)}>
            <Plus className="mr-1 h-3 w-3" /> {a}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-background p-6 text-sm text-muted-foreground">
          No pilot packages yet. Click one of the audiences above to start drafting.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {rows.map((r) => (
            <li key={r.id} className="space-y-2 rounded-lg border border-border bg-background p-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Input
                    className="font-semibold"
                    defaultValue={r.package_name}
                    onBlur={(e) =>
                      e.target.value !== r.package_name &&
                      update(r.id, { package_name: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      defaultChecked={r.public_visible}
                      onChange={(e) => update(r.id, { public_visible: e.target.checked })}
                    />
                    Public
                  </label>
                  {r.public_visible && <Badge>visible</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Input
                placeholder="Audience"
                defaultValue={r.audience ?? ""}
                onBlur={(e) =>
                  (e.target.value ?? "") !== (r.audience ?? "") &&
                  update(r.id, { audience: e.target.value })
                }
              />
              <Textarea
                rows={2}
                placeholder="Description"
                defaultValue={r.description ?? ""}
                onBlur={(e) =>
                  (e.target.value ?? "") !== (r.description ?? "") &&
                  update(r.id, { description: e.target.value })
                }
              />
              <Textarea
                rows={2}
                placeholder="Included features"
                defaultValue={r.included_features ?? ""}
                onBlur={(e) =>
                  (e.target.value ?? "") !== (r.included_features ?? "") &&
                  update(r.id, { included_features: e.target.value })
                }
              />
              <Input
                placeholder="Suggested price / status"
                defaultValue={r.suggested_price_or_status ?? ""}
                onBlur={(e) =>
                  (e.target.value ?? "") !== (r.suggested_price_or_status ?? "") &&
                  update(r.id, { suggested_price_or_status: e.target.value })
                }
              />
              <Textarea
                rows={2}
                placeholder="Internal notes"
                defaultValue={r.notes ?? ""}
                onBlur={(e) =>
                  (e.target.value ?? "") !== (r.notes ?? "") &&
                  update(r.id, { notes: e.target.value })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </OwnerShell>
  );
}
