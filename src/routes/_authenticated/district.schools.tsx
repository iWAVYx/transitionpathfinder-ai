import { createFileRoute } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Loader2, Unlink, School as SchoolIcon } from "lucide-react";

import {
  DistrictPageShell,
  useDistrictDashboard,
} from "@/components/district/DistrictPageShell";
import {
  addSchoolToDistrict,
  removeSchoolFromDistrict,
} from "@/lib/district-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/district/schools")({
  head: () => ({ meta: [{ title: "District Schools — TransitionForward" }] }),
  component: withRoleGuard(["district_admin", "admin"], DistrictSchoolsPage),
});

function DistrictSchoolsPage() {
  const { data, loading, districtId, reload } = useDistrictDashboard();
  return (
    <DistrictPageShell
      path="/district/schools"
      title="Schools In Your District"
      subtitle="Connect schools to your district, view planning activity, and identify schools that need support."
      data={data}
      loading={loading}
      districtId={districtId}
      onSwitchDistrict={(id) => reload(id)}
    >
      {(district, d) => (
        <SchoolsBody districtId={district.id} dashboard={d} onChanged={reload} />
      )}
    </DistrictPageShell>
  );
}

function SchoolsBody({
  districtId,
  dashboard,
  onChanged,
}: {
  districtId: string;
  dashboard: ReturnType<typeof useDistrictDashboard>["data"] & object;
  onChanged: (id?: string) => void;
}) {
  const addSchool = useServerFn(addSchoolToDistrict);
  const removeSchool = useServerFn(removeSchoolFromDistrict);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addSchool({
        data: {
          district_id: districtId,
          new_school_name: name.trim(),
          city: city.trim() || undefined,
          state: stateVal.trim() || undefined,
        },
      });
      toast.success("School added to district.");
      setName("");
      setCity("");
      setStateVal("");
      onChanged(districtId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add school.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(schoolId: string, schoolName: string) {
    if (!confirm(`Unlink ${schoolName} from this district?`)) return;
    try {
      await removeSchool({ data: { district_id: districtId, school_id: schoolId } });
      toast.success("School unlinked.");
      onChanged(districtId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not unlink.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg">Add a School</h2>
        <p className="text-sm text-muted-foreground">
          Create a new school under this district. School administrators can
          then claim and manage it.
        </p>
        <form
          onSubmit={handleAdd}
          className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="sch-name">School Name</Label>
            <Input
              id="sch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lincoln High School"
              required
              maxLength={160}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sch-city">City</Label>
            <Input
              id="sch-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sch-state">State</Label>
            <Input
              id="sch-state"
              value={stateVal}
              onChange={(e) => setStateVal(e.target.value)}
              maxLength={60}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border bg-card shadow-soft">
        <div className="border-b p-5">
          <h2 className="font-display text-lg">Connected Schools</h2>
          <p className="text-sm text-muted-foreground">
            School-level snapshot of staff, students, and Pathway Report
            adoption.
          </p>
        </div>
        {dashboard.schools.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <SchoolIcon className="mx-auto mb-3 h-6 w-6" />
            No schools connected yet. Add your first school above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Reports</th>
                  <th className="px-4 py-3">Open Actions</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {dashboard.schools.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[s.city, s.state].filter(Boolean).join(", ") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.active_members}
                      {s.pending_members > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (+{s.pending_members} pending)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{s.students_count}</td>
                    <td className="px-4 py-3">{s.reports_count}</td>
                    <td className="px-4 py-3">{s.open_actions}</td>
                    <td className="px-4 py-3">
                      {s.needs_followup ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                          Needs follow-up
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemove(s.id, s.name)}
                      >
                        <Unlink className="h-3.5 w-3.5" /> Unlink
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
