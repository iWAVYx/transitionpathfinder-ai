import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SUPPORT_EMAIL, mailtoHref } from "@/lib/contact";
import { Bell, Shield, Mail, KeyRound, Download, Trash2, Users, Languages, Clock, User, Accessibility, Moon } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PersonalBillingPanel } from "@/components/billing/PersonalBillingPanel";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChannelsCard } from "@/components/settings/ChannelsCard";
import { ChannelDigestCard } from "@/components/settings/ChannelDigestCard";
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
  const saveProfile = useServerFn(updateEditableProfile);
  const fetchUserPrefs = useServerFn(getUserPreferences);
  const saveUserPrefs = useServerFn(updateUserPreferences);
  const saveQuietHours = useServerFn(updateQuietHours);
  const fetchSecurityEvents = useServerFn(listSecurityEvents);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCadence, setSavingCadence] = useState(false);
  const [profileDraft, setProfileDraft] = useState<{
    first_name: string;
    last_name: string;
    preferred_name: string;
    pronouns: string;
    title: string;
    bio: string;
    phone: string;
  } | null>(null);

  useEffect(() => {
    fetchPrefs().then(setPrefs).catch(() => toast.error("Couldn't load preferences."));
    fetchProfile()
      .then((p) => {
        setProfile(p);
        setProfileDraft({
          first_name: p.first_name ?? "",
          last_name: p.last_name ?? "",
          preferred_name: p.preferred_name ?? "",
          pronouns: p.pronouns ?? "",
          title: p.title ?? "",
          bio: p.bio ?? "",
          phone: p.phone ?? "",
        });
      })
      .catch(() => {});
    fetchUserPrefs().then(setUserPrefs).catch(() => {});
    fetchSecurityEvents().then(setSecurityEvents).catch(() => {});
  }, [fetchPrefs, fetchProfile, fetchUserPrefs, fetchSecurityEvents]);

  async function submitProfile() {
    if (!profileDraft) return;
    setSavingProfile(true);
    try {
      await saveProfile({
        data: {
          first_name: profileDraft.first_name.trim() || undefined,
          last_name: profileDraft.last_name.trim() || null,
          preferred_name: profileDraft.preferred_name.trim() || null,
          pronouns: profileDraft.pronouns.trim() || null,
          title: profileDraft.title.trim() || null,
          bio: profileDraft.bio.trim() || null,
          phone: profileDraft.phone.trim() || null,
        },
      });
      toast.success("Profile saved.");
      const fresh = await fetchProfile();
      setProfile(fresh);
      const events = await fetchSecurityEvents();
      setSecurityEvents(events);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function toggleAccessibility(
    key: "reduced_motion" | "high_contrast" | "dyslexia_friendly",
    value: boolean,
  ) {
    if (!userPrefs) return;
    const prev = userPrefs;
    setUserPrefs({ ...userPrefs, [key]: value });
    try {
      await saveUserPrefs({ data: { [key]: value } });
    } catch {
      toast.error("Couldn't save accessibility preference.");
      setUserPrefs(prev);
    }
  }

  async function submitQuietHours(start: string, end: string, tz: string) {
    try {
      await saveQuietHours({
        data: {
          quiet_hours_start: start || null,
          quiet_hours_end: end || null,
          quiet_hours_tz: tz || null,
        },
      });
      toast.success("Quiet hours saved.");
      const fresh = await fetchPrefs();
      setPrefs(fresh);
    } catch {
      toast.error("Couldn't save quiet hours.");
    }
  }


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

        {/* Billing */}
        <div id="billing" className="mt-6 scroll-mt-24">
          <PersonalBillingPanel />
        </div>



        {/* Profile */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg">Profile</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            How you show up to your team. Your role, organization, and student assignments are
            managed separately.
          </p>
          {!profileDraft ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  value={profileDraft.first_name}
                  onChange={(e) => setProfileDraft({ ...profileDraft, first_name: e.target.value })}
                  maxLength={80}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  value={profileDraft.last_name}
                  onChange={(e) => setProfileDraft({ ...profileDraft, last_name: e.target.value })}
                  maxLength={80}
                />
              </div>
              <div>
                <Label htmlFor="preferred_name">Preferred name</Label>
                <Input
                  id="preferred_name"
                  value={profileDraft.preferred_name}
                  onChange={(e) => setProfileDraft({ ...profileDraft, preferred_name: e.target.value })}
                  placeholder="What we'll call you"
                  maxLength={80}
                />
              </div>
              <div>
                <Label htmlFor="pronouns">Pronouns (optional)</Label>
                <Input
                  id="pronouns"
                  value={profileDraft.pronouns}
                  onChange={(e) => setProfileDraft({ ...profileDraft, pronouns: e.target.value })}
                  placeholder="e.g. she/her, they/them"
                  maxLength={40}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  value={profileDraft.title}
                  onChange={(e) => setProfileDraft({ ...profileDraft, title: e.target.value })}
                  placeholder="e.g. Transition Coordinator"
                  maxLength={120}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  value={profileDraft.phone}
                  onChange={(e) => setProfileDraft({ ...profileDraft, phone: e.target.value })}
                  placeholder="+1 555 555 5555"
                  maxLength={32}
                />
              </div>
              <div>
                <Label>Role</Label>
                <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {profile?.primary_role ?? "Not set"}
                  <span className="ml-2 text-xs">(managed by your organization)</span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="bio">About you (optional)</Label>
                <Textarea
                  id="bio"
                  value={profileDraft.bio}
                  onChange={(e) => setProfileDraft({ ...profileDraft, bio: e.target.value })}
                  placeholder="A short note for your team."
                  maxLength={500}
                  rows={3}
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button onClick={submitProfile} disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save Profile"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Accessibility */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <Accessibility className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg">Accessibility</h2>
          </div>
          {userPrefs === null ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              <li className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium">Reduce Motion</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Turn off page transitions and animated backgrounds.
                  </p>
                </div>
                <Switch
                  checked={userPrefs.reduced_motion}
                  onCheckedChange={(v) => toggleAccessibility("reduced_motion", v)}
                />
              </li>
              <li className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium">High Contrast</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Boost contrast for text and controls.
                  </p>
                </div>
                <Switch
                  checked={userPrefs.high_contrast}
                  onCheckedChange={(v) => toggleAccessibility("high_contrast", v)}
                />
              </li>
              <li className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium">Dyslexia-Friendly Font</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use a font tuned for easier reading.
                  </p>
                </div>
                <Switch
                  checked={userPrefs.dyslexia_friendly}
                  onCheckedChange={(v) => toggleAccessibility("dyslexia_friendly", v)}
                />
              </li>
            </ul>
          )}
        </div>

        {/* Quiet hours */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg">Quiet Hours</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Pause notifications overnight. Instant alerts wait until quiet hours end.
          </p>
          {prefs === null ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="qh-start">Start</Label>
                <Input
                  id="qh-start"
                  type="time"
                  defaultValue={prefs.quiet_hours_start ?? ""}
                  onBlur={(e) =>
                    submitQuietHours(
                      e.target.value,
                      prefs.quiet_hours_end ?? "",
                      prefs.quiet_hours_tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="qh-end">End</Label>
                <Input
                  id="qh-end"
                  type="time"
                  defaultValue={prefs.quiet_hours_end ?? ""}
                  onBlur={(e) =>
                    submitQuietHours(
                      prefs.quiet_hours_start ?? "",
                      e.target.value,
                      prefs.quiet_hours_tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="qh-tz">Time zone</Label>
                <Input
                  id="qh-tz"
                  defaultValue={prefs.quiet_hours_tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
                  onBlur={(e) =>
                    submitQuietHours(
                      prefs.quiet_hours_start ?? "",
                      prefs.quiet_hours_end ?? "",
                      e.target.value,
                    )
                  }
                />
              </div>
            </div>
          )}
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

        {/* Transition Channel digest & breakthroughs */}
        <ChannelDigestCard />




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
                  <a className="underline" href={mailtoHref("support")}>
                    {SUPPORT_EMAIL}
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
