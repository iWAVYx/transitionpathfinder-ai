import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ownerListSettings,
  ownerUpdateSetting,
  type SiteSetting,
} from "@/lib/owner/owner.functions";

export const Route = createFileRoute("/_authenticated/owner/settings")({
  head: () => ({ meta: [{ title: "Site settings — Admin Hub" }] }),
  component: SettingsPage,
});

type SettingGroup = {
  group: string;
  keys: Array<{ key: string; label: string; type: "text" | "longtext" | "bool" | "json" }>;
};

const GROUPS: SettingGroup[] = [
  {
    group: "Branding",
    keys: [
      { key: "site_name", label: "Site name", type: "text" },
      { key: "footer_tagline", label: "Footer tagline", type: "longtext" },
      { key: "contact_email", label: "Contact email", type: "text" },
    ],
  },
  {
    group: "SEO",
    keys: [
      { key: "seo_title", label: "SEO title", type: "text" },
      { key: "seo_description", label: "SEO description", type: "longtext" },
    ],
  },
  {
    group: "Social",
    keys: [{ key: "social_links", label: "Social links (JSON)", type: "json" }],
  },
  {
    group: "Status toggles",
    keys: [
      { key: "maintenance_mode", label: "Maintenance mode", type: "bool" },
      { key: "waitlist_open", label: "Waitlist open", type: "bool" },
      { key: "demo_mode", label: "Demo mode", type: "bool" },
      { key: "launch_status", label: "Launch status", type: "text" },
    ],
  },
];

function SettingsPage() {
  const list = useServerFn(ownerListSettings);
  const update = useServerFn(ownerUpdateSetting);
  const [byKey, setByKey] = useState<Map<string, SiteSetting>>(new Map());
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    list()
      .then((r) => {
        const m = new Map(r.settings.map((s) => [s.setting_key, s]));
        setByKey(m);
        const v: Record<string, any> = {};
        for (const s of r.settings) v[s.setting_key] = s.setting_value;
        setValues(v);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  async function save(key: string, val: any) {
    setSaving(key);
    try {
      await update({ data: { setting_key: key, setting_value: val } });
      setValues((p) => ({ ...p, [key]: val }));
      toast.success(`${key} saved`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(null);
    }
  }

  // Surface any settings stored in the DB that aren't in the predefined GROUPS,
  // so admins can still see and edit them.
  const knownKeys = new Set(GROUPS.flatMap((g) => g.keys.map((k) => k.key)));
  const extraKeys = Array.from(byKey.keys()).filter((k) => !knownKeys.has(k));

  if (loading) {
    return (
      <OwnerShell title="Site settings">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </OwnerShell>
    );
  }

  return (
    <OwnerShell
      title="Site settings"
      description="Site-wide configuration. Most values are publicly readable."
    >
      <div className="space-y-6">
        {GROUPS.map((g) => (
          <section key={g.group} className="rounded-lg border border-border bg-background p-5">
            <h2 className="mb-4 font-display text-base font-medium">{g.group}</h2>
            <div className="space-y-4">
              {g.keys.map((k) => {
                const setting = byKey.get(k.key);
                if (!setting && k.type !== "bool" && k.type !== "text" && k.type !== "longtext" && k.type !== "json") return null;
                const val = values[k.key];
                return (
                  <div key={k.key} className="grid gap-2 sm:grid-cols-[200px_1fr_auto] sm:items-start">
                    <Label htmlFor={k.key} className="pt-2 text-sm font-medium">
                      {k.label}
                    </Label>
                    <div>
                      {k.type === "text" && (
                        <Input
                          id={k.key}
                          value={String(val ?? "")}
                          onChange={(e) =>
                            setValues((p) => ({ ...p, [k.key]: e.target.value }))
                          }
                        />
                      )}
                      {k.type === "longtext" && (
                        <Textarea
                          id={k.key}
                          rows={3}
                          value={String(val ?? "")}
                          onChange={(e) =>
                            setValues((p) => ({ ...p, [k.key]: e.target.value }))
                          }
                        />
                      )}
                      {k.type === "bool" && (
                        <Switch
                          id={k.key}
                          checked={Boolean(val)}
                          onCheckedChange={(v) => {
                            setValues((p) => ({ ...p, [k.key]: v }));
                            save(k.key, v);
                          }}
                        />
                      )}
                      {k.type === "json" && (
                        <Textarea
                          id={k.key}
                          rows={4}
                          className="font-mono text-xs"
                          value={
                            typeof val === "string" ? val : JSON.stringify(val ?? {}, null, 2)
                          }
                          onChange={(e) =>
                            setValues((p) => ({ ...p, [k.key]: e.target.value }))
                          }
                        />
                      )}
                    </div>
                    {k.type !== "bool" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving === k.key}
                        onClick={() => {
                          let toSave = values[k.key];
                          if (k.type === "json" && typeof toSave === "string") {
                            try {
                              toSave = JSON.parse(toSave);
                            } catch {
                              toast.error("Invalid JSON");
                              return;
                            }
                          }
                          save(k.key, toSave);
                        }}
                      >
                        {saving === k.key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </OwnerShell>
  );
}
