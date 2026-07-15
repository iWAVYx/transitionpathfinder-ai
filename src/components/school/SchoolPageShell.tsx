import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Loader2, Plus } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RoleGuard } from "@/components/RoleGuard";
import { SchoolNav } from "@/components/school/SchoolNav";
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
  getSchoolDashboard,
  createSchoolForAdmin,
  type SchoolDashboard,
  type SchoolOrg,
} from "@/lib/school-admin.functions";
import { ROLE_DASHBOARD_TEST_IDS } from "@/lib/dashboard-testids";


export function useSchoolDashboard() {
  const fetchDash = useServerFn(getSchoolDashboard);
  const [data, setData] = useState<SchoolDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | undefined>(undefined);

  async function reload(nextOrgId?: string) {
    setLoading(true);
    try {
      const d = await fetchDash({ data: { org_id: nextOrgId } });
      setData(d);
      setOrgId(d.selected_org_id ?? undefined);
    } catch {
      toast.error("Could not load school data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, orgId, reload };
}

export function SchoolPageShell({
  path,
  title,
  subtitle,
  data,
  loading,
  orgId,
  onSwitchOrg,
  children,
}: {
  path: string;
  title: string;
  subtitle: string;
  data: SchoolDashboard | null;
  loading: boolean;
  orgId: string | undefined;
  onSwitchOrg: (id: string) => void;
  children: (org: SchoolOrg, data: SchoolDashboard) => React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <SiteHeader />
      <main
        className="site-shell-main flex-1 overflow-x-clip"
        style={{ minHeight: "60vh" }}
        data-testid={ROLE_DASHBOARD_TEST_IDS.school_admin}
        data-auth-state="ready"
      >
        <RoleGuard path={path}>
          <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <Breadcrumbs
              trail={[
                { label: "Dashboard", to: "/dashboard" },
                { label: "School Administration" },
                { label: title },
              ]}
            />

            <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  School Administrator
                </p>
                <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">{title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              </div>
              {data && data.orgs.length > 1 && (
                <Select value={orgId} onValueChange={onSwitchOrg}>
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.orgs.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        <span className="inline-flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5" /> {o.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </header>

            <SchoolNav />

            <div className="mt-6">
              {loading && !data ? (
                <div className="py-12 text-center">
                  <h2 className="font-display text-xl font-medium tracking-tight">
                    Loading School Administration Data
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Gathering connected staff, students, and transition planning
                    activity for your school.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading School Workspace…</span>
                  </div>
                </div>
              ) : !data?.is_school_admin || data.orgs.length === 0 ? (
                <CreateSchoolCard onCreated={() => window.location.reload()} />
              ) : (() => {
                  const org = data.orgs.find((o) => o.id === orgId) ?? data.orgs[0];
                  return children(org, data);
                })()}
            </div>
          </section>
        </RoleGuard>
      </main>
      <SiteFooter />
    </div>
  );
}

function CreateSchoolCard({ onCreated }: { onCreated: () => void }) {
  const create = useServerFn(createSchoolForAdmin);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [type, setType] = useState<"school" | "district" | "agency">("school");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await create({
        data: {
          name: name.trim(),
          type,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
        },
      });
      toast.success("School created.");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create school.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-8 shadow-soft">
      <Building2 className="h-6 w-6 text-primary" />
      <h2 className="mt-3 font-display text-2xl">Set Up Your School</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Create your organization so you can invite staff, view aggregate progress, and manage
        implementation across your team.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:max-w-xl">
        <div className="grid gap-1.5">
          <Label htmlFor="org-name">Organization Name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lincoln High School"
            required
            maxLength={160}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="school">School</SelectItem>
              <SelectItem value="district">District</SelectItem>
              <SelectItem value="agency">Agency</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="org-city">City</Label>
            <Input id="org-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="org-state">State</Label>
            <Input id="org-state" value={state} onChange={(e) => setState(e.target.value)} maxLength={60} />
          </div>
        </div>
        <div>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create School
          </Button>
        </div>
      </form>
    </div>
  );
}
