import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Loader2, Plus } from "lucide-react";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RoleGuard } from "@/components/RoleGuard";
import { DistrictNav } from "@/components/district/DistrictNav";
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
import {
  getDistrictDashboard,
  createDistrict,
  type DistrictDashboard,
  type DistrictOrg,
} from "@/lib/district-admin.functions";
import { ROLE_DASHBOARD_TEST_IDS } from "@/lib/dashboard-testids";

export function useDistrictDashboard() {
  const fetchDash = useServerFn(getDistrictDashboard);
  const [data, setData] = useState<DistrictDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [districtId, setDistrictId] = useState<string | undefined>(undefined);

  async function reload(nextId?: string) {
    setLoading(true);
    try {
      const d = await fetchDash({ data: { district_id: nextId } });
      setData(d);
      setDistrictId(d.selected_district_id ?? undefined);
    } catch {
      toast.error("Could not load district data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, districtId, reload };
}

export function DistrictPageShell({
  path,
  title,
  subtitle,
  data,
  loading,
  districtId,
  onSwitchDistrict,
  children,
}: {
  path: string;
  title: string;
  subtitle: string;
  data: DistrictDashboard | null;
  loading: boolean;
  districtId: string | undefined;
  onSwitchDistrict: (id: string) => void;
  children: (district: DistrictOrg, data: DistrictDashboard) => React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader />
      <main
        className="site-shell-main flex-1"
        data-testid={ROLE_DASHBOARD_TEST_IDS.district_admin}
      >
        <RoleGuard path={path}>
          <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <Breadcrumbs
              trail={[
                { label: "Dashboard", to: "/dashboard" },
                { label: "District Administration" },
                { label: title },
              ]}
            />

            <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">
                  District leadership
                </p>
                <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              </div>
              {data && data.districts.length > 1 && (
                <Select value={districtId} onValueChange={onSwitchDistrict}>
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.districts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="inline-flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5" /> {d.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </header>

            <DistrictNav />

            <div className="mt-6">
              {loading && !data ? (
                <div className="py-12 text-center">
                  <h2 className="font-display text-xl font-medium tracking-tight">
                    Loading District Administration Data
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Aggregating schools, staff, and transition planning
                    progress across your district.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading District Workspace…</span>
                  </div>
                </div>
              ) : !data?.is_district_admin || data.districts.length === 0 ? (
                <CreateDistrictCard onCreated={() => window.location.reload()} />
              ) : (() => {
                  const district =
                    data.districts.find((d) => d.id === districtId) ?? data.districts[0];
                  return children(district, data);
                })()}
            </div>
          </section>
        </RoleGuard>
      </main>
      <SiteFooter />
    </div>
  );
}


function CreateDistrictCard({ onCreated }: { onCreated: () => void }) {
  const create = useServerFn(createDistrict);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await create({
        data: {
          name: name.trim(),
          city: city.trim() || undefined,
          state: state.trim() || undefined,
        },
      });
      toast.success("District created.");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create district.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-8 shadow-soft">
      <Building2 className="h-6 w-6 text-primary" />
      <h2 className="mt-3 font-display text-2xl">Set Up Your District</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Create your district workspace so you can connect schools, invite school
        administrators and educators, and track implementation across your
        district.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:max-w-xl">
        <div className="grid gap-1.5">
          <Label htmlFor="district-name">District Name</Label>
          <Input
            id="district-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hartford Public Schools"
            required
            maxLength={160}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="district-city">City</Label>
            <Input
              id="district-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="district-state">State</Label>
            <Input
              id="district-state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              maxLength={60}
            />
          </div>
        </div>
        <div>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create District
          </Button>
        </div>
      </form>
    </div>
  );
}
