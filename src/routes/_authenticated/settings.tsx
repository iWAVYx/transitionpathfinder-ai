import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, Shield, Mail } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  getNotificationPrefs,
  updateNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/prefs.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — TransitionForward" }] }),
  component: SettingsPage,
});

type PrefKey =
  | "email_collab_invites"
  | "email_goal_reminders"
  | "email_weekly_digest"
  | "email_report_ready";

const PREF_LABELS: { key: PrefKey; title: string; desc: string }[] = [
  {
    key: "email_report_ready",
    title: "When a new pathway report is ready",
    desc: "We'll email you a quick summary the moment your report finishes generating.",
  },
  {
    key: "email_goal_reminders",
    title: "Gentle nudges on goals",
    desc: "Light reminders when a goal target date is approaching — never pushy.",
  },
  {
    key: "email_weekly_digest",
    title: "Weekly progress digest",
    desc: "A calm Sunday email with what changed across your students this week.",
  },
  {
    key: "email_collab_invites",
    title: "Collaboration invites",
    desc: "When an educator or family member is added to a student's plan.",
  },
];

function SettingsPage() {
  const { user } = useAuth();
  const fetchPrefs = useServerFn(getNotificationPrefs);
  const savePrefs = useServerFn(updateNotificationPrefs);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPrefs().then(setPrefs).catch(() => toast.error("Couldn't load preferences."));
  }, [fetchPrefs]);

  async function toggle(key: PrefKey, value: boolean) {
    if (!prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    try {
      await savePrefs({ data: { [key]: value } });
    } catch {
      toast.error("Couldn't save — try again.");
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Settings" }]} />
      </div>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your account</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose how we keep in touch and review the basics of your account.
        </p>

        {/* Account */}
        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg">Account</h2>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{user?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Signed in via</dt>
              <dd className="font-medium capitalize">
                {user?.app_metadata?.provider ?? "email"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Notifications */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg">Email notifications</h2>
          </div>
          {prefs === null ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {PREF_LABELS.map((p) => (
                <li key={p.key} className="flex items-start justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                  <Switch
                    checked={prefs[p.key]}
                    onCheckedChange={(v) => toggle(p.key, v)}
                    disabled={saving}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Security */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg">Security</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Your password is checked against the Have I Been Pwned database — if it's known to be
            leaked elsewhere, we'll ask you to choose a stronger one. Google sign-in is also
            available and stores no password.
          </p>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={async () => {
                if (!user?.email) return;
                const { supabase } = await import("@/integrations/supabase/client");
                const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) toast.error(error.message);
                else toast.success("Reset link sent to your email.");
              }}
            >
              Send password reset email
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
