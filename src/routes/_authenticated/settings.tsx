import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, Shield, Mail, KeyRound, Download, Trash2, Users, Languages, Clock, User, Accessibility, Moon } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChannelsCard } from "@/components/settings/ChannelsCard";
import { useAuth } from "@/hooks/use-auth";
import {
  getNotificationPrefs,
  updateNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/prefs.functions";
import { getProfile, updateProfileLanguage, type Profile } from "@/lib/profile.functions";
import { updateEditableProfile } from "@/lib/profile-editable.functions";
import {
  getUserPreferences,
  updateUserPreferences,
  updateQuietHours,
  listSecurityEvents,
  type UserPreferences,
  type SecurityEvent,
} from "@/lib/user-preferences.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — TransitionForward" }] }),
  component: SettingsPage,
});

type PrefKey =
  | "email_collab_invites"
  | "email_goal_reminders"
  | "email_weekly_digest"
  | "email_report_ready"
  | "in_app_enabled"
  | "sms_enabled";

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
  const fetchProfile = useServerFn(getProfile);
  const saveLanguage = useServerFn(updateProfileLanguage);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingCadence, setSavingCadence] = useState(false);

  useEffect(() => {
    fetchPrefs().then(setPrefs).catch(() => toast.error("Couldn't load preferences."));
    fetchProfile().then(setProfile).catch(() => {});
  }, [fetchPrefs, fetchProfile]);

  async function setCadence(value: "instant" | "daily" | "weekly") {
    if (!prefs || prefs.notification_cadence === value) return;
    const prev = prefs;
    setPrefs({ ...prefs, notification_cadence: value });
    setSavingCadence(true);
    try {
      await savePrefs({ data: { notification_cadence: value } });
    } catch {
      toast.error("Couldn't save cadence — try again.");
      setPrefs(prev);
    } finally {
      setSavingCadence(false);
    }
  }

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

  async function setLanguage(code: string) {
    if (!profile) return;
    const prev = profile;
    setProfile({ ...profile, language: code });
    try {
      await saveLanguage({ data: { language: code } });
      toast.success("Language updated.");
    } catch {
      toast.error("Couldn't save language.");
      setProfile(prev);
    }
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Settings" }]} />
      </div>
      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your account</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">Settings</h1>
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
            <h2 className="font-display text-lg">Email Notifications</h2>
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

        {/* Channels */}
        <ChannelsCard
          prefs={prefs}
          onTogglePref={(key, v) => toggle(key, v)}
          saving={saving}
        />


        {/* Cadence (scaffold) */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg">Cadence</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            How often should we group updates? You can change this anytime.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["instant", "daily", "weekly"] as const).map((c) => {
              const active = (prefs?.notification_cadence ?? "daily") === c;
              return (
                <button
                  key={c}
                  type="button"
                  disabled={!prefs || savingCadence}
                  onClick={() => setCadence(c)}
                  className={
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-60 " +
                    (active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground")
                  }
                >
                  {c === "instant" ? "Instant" : c === "daily" ? "Daily digest" : "Weekly digest"}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Controls how often we batch the email notifications you've enabled above.
          </p>
        </div>

        {/* Language */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg">Language</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose your preferred language for the interface. Plain-language rewrites and full
            translation are rolling out — your choice is saved now so we can switch you over the
            moment each language goes live.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { code: "en", label: "English" },
              { code: "es", label: "Español" },
              { code: "zh", label: "中文" },
              { code: "vi", label: "Tiếng Việt" },
              { code: "ar", label: "العربية" },
            ].map((l) => {
              const active = (profile?.language ?? "en") === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLanguage(l.code)}
                  className={
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors " +
                    (active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground")
                  }
                >
                  {l.label}
                </button>
              );
            })}
          </div>
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
            <Button asChild variant="outline" className="ml-2">
              <Link to="/security">Manage two-factor authentication</Link>
            </Button>
          </div>
        </div>

        {/* Data & consent */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg">Your Data, Your Call</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Everything you store here is yours. We never sell student data, never train AI models on
            your documents, and never share with a school or partner without your explicit consent.
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-3 rounded-xl border bg-background p-3">
              <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1">
                <p className="font-medium">Manage who can see each student</p>
                <p className="text-xs text-muted-foreground">
                  Each student page lists every collaborator. Revoke anyone, anytime — they lose
                  access immediately.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/students">Open students</Link>
              </Button>
            </li>
            <li className="flex items-start gap-3 rounded-xl border bg-background p-3">
              <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                <Download className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1">
                <p className="font-medium">Export everything</p>
                <p className="text-xs text-muted-foreground">
                  Want a copy of every report, goal, and document? Email{" "}
                  <a className="underline" href="mailto:hello@transitionforwardct.com">
                    hello@transitionforwardct.com
                  </a>{" "}
                  and we'll send a full export within 7 days.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border bg-background p-3">
              <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1">
                <p className="font-medium">Delete your account & data</p>
                <p className="text-xs text-muted-foreground">
                  Reach out and we'll permanently delete your account and all associated data — no
                  questions asked, within 30 days.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </SiteShell>
  );
}
