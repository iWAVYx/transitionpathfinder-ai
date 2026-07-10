import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserCog, Loader2, Save } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getPartnerWorkspace,
  updatePartnerOrgProfile,
  type PartnerOrg,
} from "@/lib/partner-workspace.functions";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/partners-manage_/profile")({
  beforeLoad: () => ensureRoleAccess(["partner", "admin"]),
  head: () => ({
    meta: [
      { title: "Partner Profile — Partner Workspace" },
      {
        name: "description",
        content:
          "Edit your organization's public profile — name, website, contact, and service area.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/partners-manage/profile">
      <PartnerProfilePage />
    </RoleGuard>
  ),
});

function PartnerProfilePage() {
  const loadWs = useServerFn(getPartnerWorkspace);
  const saveProfile = useServerFn(updatePartnerOrgProfile);
  const [org, setOrg] = useState<PartnerOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    website: "",
    contact_email: "",
    city: "",
    state: "",
    address: "",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const w = await loadWs({ data: {} });
        const o = w.selected_org;
        if (alive && o) {
          setOrg(o);
          setForm({
            name: o.name ?? "",
            website: o.website ?? "",
            contact_email: o.contact_email ?? "",
            city: o.city ?? "",
            state: o.state ?? "",
            address: o.address ?? "",
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadWs]);

  const completion = (() => {
    const fields = [form.name, form.website, form.contact_email, form.city, form.state, form.address];
    const filled = fields.filter((f) => f.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  })();

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    try {
      await saveProfile({
        data: {
          id: org.id,
          name: form.name.trim() || undefined,
          website: form.website.trim() || undefined,
          contact_email: form.contact_email.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          address: form.address.trim() || undefined,
        },
      });
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Breadcrumbs
          trail={[
            { label: "Partner Workspace", to: "/partners-manage" },
            { label: "Partner Profile" },
          ]}
        />
        <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Partner Workspace
            </p>
            <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
              Partner Profile
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This information appears with every opportunity you publish.
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div className="font-semibold text-foreground">{completion}% complete</div>
            <div>Fill each field to help families find you.</div>
          </div>
        </header>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !org ? (
            <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
              <UserCog className="mx-auto h-6 w-6 text-muted-foreground" />
              <h2 className="mt-2 font-display text-xl">No partner organization yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your organization from the Partner Workspace before editing the profile.
              </p>
              <Button asChild className="mt-4">
                <Link to="/partners-manage">Open Partner Workspace</Link>
              </Button>
            </div>
          ) : (
            <form
              onSubmit={onSave}
              className="grid gap-4 rounded-2xl border bg-card p-6 shadow-soft"
            >
              <div className="grid gap-1.5">
                <Label htmlFor="p-name">Organization name</Label>
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={200}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="p-website">Website</Label>
                  <Input
                    id="p-website"
                    type="url"
                    placeholder="https://"
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    maxLength={500}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="p-email">Contact email</Label>
                  <Input
                    id="p-email"
                    type="email"
                    placeholder="programs@example.org"
                    value={form.contact_email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contact_email: e.target.value }))
                    }
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="p-city">City</Label>
                  <Input
                    id="p-city"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    maxLength={120}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="p-state">State</Label>
                  <Input
                    id="p-state"
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    maxLength={60}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-address">Street address</Label>
                <Textarea
                  id="p-address"
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  maxLength={300}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save profile
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
