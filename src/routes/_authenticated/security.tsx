import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({
    meta: [
      { title: "Security — TransitionForward" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecurityPage,
});

type Factor = {
  id: string;
  friendly_name?: string | null;
  status: "verified" | "unverified";
};

function SecurityPage() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [pendingChallengeId, setPendingChallengeId] = useState<string | null>(
    null,
  );
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(((data?.totp as Factor[]) ?? []));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator (${new Date().toLocaleDateString()})`,
    });
    if (error || !data) {
      toast.error(error?.message ?? "Could not start enrollment");
      setEnrolling(false);
      return;
    }
    setPendingFactorId(data.id);
    setOtpauth(data.totp.uri);
    setSecret(data.totp.secret);
    try {
      const url = await QRCode.toDataURL(data.totp.uri);
      setQrDataUrl(url);
    } catch {
      setQrDataUrl(null);
    }
    const { data: challenge } = await supabase.auth.mfa.challenge({
      factorId: data.id,
    });
    setPendingChallengeId(challenge?.id ?? null);
  };

  const finishEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFactorId || !pendingChallengeId || code.length !== 6) return;
    setVerifying(true);
    const { error } = await supabase.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: pendingChallengeId,
      code,
    });
    setVerifying(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Two-factor authentication enabled");
    setEnrolling(false);
    setPendingFactorId(null);
    setPendingChallengeId(null);
    setOtpauth(null);
    setSecret(null);
    setQrDataUrl(null);
    setCode("");
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Removed");
    refresh();
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-medium tracking-tight">
        Security
      </h1>

      <section className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <h2 className="font-display text-xl font-medium">
          Two-factor authentication
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a time-based one-time code from an authenticator app
          (1Password, Authy, Google Authenticator…) on top of your password.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : factors.filter((f) => f.status === "verified").length > 0 ? (
          <ul className="mt-4 space-y-2">
            {factors
              .filter((f) => f.status === "verified")
              .map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <span>{f.friendly_name || "Authenticator app"}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(f.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
          </ul>
        ) : !enrolling ? (
          <Button type="button" className="mt-4" onClick={startEnroll}>
            Set up authenticator app
          </Button>
        ) : null}

        {enrolling && otpauth && (
          <form onSubmit={finishEnroll} className="mt-6 space-y-4">
            <div className="rounded-2xl bg-muted p-4">
              <p className="text-sm font-medium">Scan with your app</p>
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR code for two-factor enrollment"
                  className="mx-auto mt-3 size-44"
                />
              )}
              <p className="mt-3 break-all text-center font-mono text-xs text-muted-foreground">
                {secret}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm">Then enter the 6-digit code:</p>
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                aria-label="Confirmation code"
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={verifying || code.length !== 6}
              >
                {verifying ? "Verifying…" : "Confirm"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEnrolling(false);
                  if (pendingFactorId) {
                    supabase.auth.mfa.unenroll({ factorId: pendingFactorId });
                  }
                  setPendingFactorId(null);
                  setPendingChallengeId(null);
                  setOtpauth(null);
                  setSecret(null);
                  setQrDataUrl(null);
                  setCode("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
