import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, Mail, MessageSquare, Smartphone, ShieldCheck, X } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NotificationPrefs } from "@/lib/prefs.functions";
import {
  getSmsProviderStatus,
  requestSmsVerification,
  confirmSmsVerification,
  disconnectSms,
} from "@/lib/sms.functions";

type PrefKey =
  | "email_collab_invites"
  | "email_goal_reminders"
  | "email_weekly_digest"
  | "email_report_ready"
  | "in_app_enabled"
  | "sms_enabled";

export function ChannelsCard({
  prefs,
  onTogglePref,
  saving,
}: {
  prefs: NotificationPrefs | null;
  onTogglePref: (key: PrefKey, v: boolean) => void;
  saving: boolean;
}) {
  const checkProvider = useServerFn(getSmsProviderStatus);
  const requestCode = useServerFn(requestSmsVerification);
  const confirmCode = useServerFn(confirmSmsVerification);
  const disconnect = useServerFn(disconnectSms);

  const [providerReady, setProviderReady] = useState<boolean | null>(null);
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"idle" | "code">("idle");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    checkProvider()
      .then((r) => setProviderReady(r.ready))
      .catch(() => setProviderReady(false));
  }, [checkProvider]);

  const hasVerifiedPhone = Boolean(prefs?.sms_phone_e164 && prefs?.sms_verified_at);

  async function handleSendCode() {
    setBusy(true);
    try {
      await requestCode({ data: { phone: phone.trim() } });
      setStage("code");
      toast.success("Code sent — check your texts.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send code.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmCode() {
    setBusy(true);
    try {
      await confirmCode({ data: { code: code.trim() } });
      toast.success("Phone verified — text alerts are on.");
      setStage("idle");
      setPhone("");
      setCode("");
      // Page-level state will refresh next reload; force refresh by reloading prefs is on parent.
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't verify code.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnect();
      toast.success("Phone removed.");
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove phone.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg">Channels</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick how we reach you. Email is always on for important account events.
      </p>
      <ul className="mt-4 divide-y divide-border">
        {/* Email — always on */}
        <li className="flex items-start justify-between gap-4 py-4">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Always on for important account events.
              </p>
            </div>
          </div>
          <Switch checked disabled />
        </li>

        {/* In-app */}
        <li className="flex items-start justify-between gap-4 py-4">
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">In-app</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Show updates in the bell badge at the top of the app.
              </p>
            </div>
          </div>
          <Switch
            checked={prefs?.in_app_enabled ?? true}
            onCheckedChange={(v) => onTogglePref("in_app_enabled", v)}
            disabled={!prefs || saving}
          />
        </li>

        {/* SMS */}
        <li className="flex flex-col gap-3 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Text (SMS)</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {providerReady === false
                    ? "An admin needs to connect Twilio before text alerts can be turned on."
                    : hasVerifiedPhone
                      ? `Sending to ${prefs?.sms_phone_e164}.`
                      : "Verify a phone number to receive meeting reminders and urgent updates."}
                </p>
              </div>
            </div>
            <Switch
              checked={prefs?.sms_enabled ?? false}
              onCheckedChange={(v) => onTogglePref("sms_enabled", v)}
              disabled={!prefs || saving || !providerReady || !hasVerifiedPhone}
            />
          </div>

          {providerReady && !hasVerifiedPhone && stage === "idle" && (
            <div className="ml-7 flex flex-wrap items-center gap-2">
              <Input
                type="tel"
                inputMode="tel"
                placeholder="+15555550123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 max-w-[200px]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendCode}
                disabled={busy || !/^\+[1-9][0-9]{7,14}$/.test(phone.trim())}
              >
                Send code
              </Button>
            </div>
          )}

          {providerReady && !hasVerifiedPhone && stage === "code" && (
            <div className="ml-7 flex flex-wrap items-center gap-2">
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="h-9 max-w-[140px]"
              />
              <Button
                size="sm"
                onClick={handleConfirmCode}
                disabled={busy || code.length !== 6}
              >
                <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Verify
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStage("idle");
                  setCode("");
                }}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          )}

          {hasVerifiedPhone && (
            <div className="ml-7">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDisconnect}
                disabled={busy}
                className="text-muted-foreground"
              >
                <X className="mr-1 h-3.5 w-3.5" /> Remove phone
              </Button>
            </div>
          )}
        </li>
      </ul>
    </div>
  );
}
