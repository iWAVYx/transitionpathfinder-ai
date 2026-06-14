import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login/2fa")({
  validateSearch: (s: { redirect?: string }): { redirect: string } => ({
    redirect: s.redirect || "/dashboard",
  }),
  head: () => ({
    meta: [
      { title: "Two-Factor Verification — TransitionForward" },
      {
        name: "description",
        content: "Enter your six-digit authenticator code to finish signing in.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TwoFactorChallengePage,
});

function TwoFactorChallengePage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  // On mount: confirm there's a session that NEEDS aal2, pick a verified
  // TOTP factor, and request a challenge. If anything is off, bounce.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate({ to: "/login", search: { redirect }, replace: true });
        return;
      }

      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (
        aal &&
        aal.currentLevel === "aal2" &&
        aal.nextLevel === "aal2"
      ) {
        // Already verified — skip the challenge.
        navigate({ to: redirect, replace: true });
        return;
      }

      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();
      if (factorsError) {
        if (!cancelled) {
          setError(factorsError.message);
          setBootstrapping(false);
        }
        return;
      }
      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (!totp) {
        // No enrolled factor — shouldn't be here.
        navigate({ to: redirect, replace: true });
        return;
      }

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (cancelled) return;
      if (challengeError || !challenge) {
        setError(challengeError?.message ?? "Could not start 2FA challenge");
        setBootstrapping(false);
        return;
      }
      setFactorId(totp.id);
      setChallengeId(challenge.id);
      setBootstrapping(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, redirect]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !challengeId || code.length !== 6) return;
    setSubmitting(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });
    if (verifyError) {
      setError(verifyError.message);
      setSubmitting(false);
      setCode("");
      // Request a fresh challenge so the user can retry without reloading.
      const { data: fresh } = await supabase.auth.mfa.challenge({ factorId });
      if (fresh) setChallengeId(fresh.id);
      return;
    }
    toast.success("Verified");
    navigate({ to: redirect, replace: true });
  };

  const onCancel = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <SiteShell>
      <section className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Extra Check
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground">
            Two-Factor Verification
          </h1>
          <p
            className="mt-3 text-sm leading-relaxed text-muted-foreground"
            id="twofa-instructions"
          >
            Open your authenticator app and enter the six-digit code for
            TransitionForward.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <div
              role="status"
              aria-live="polite"
              className="sr-only"
              data-testid="twofa-status"
            >
              {bootstrapping
                ? "Preparing Two-Factor Challenge"
                : error
                  ? `Error: ${error}`
                  : "Ready for your six-digit code"}
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                autoFocus
                disabled={bootstrapping || submitting}
                aria-label="Six-digit authenticator code"
                aria-describedby="twofa-instructions"
                data-testid="twofa-code"
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <p
                className="text-center text-xs text-destructive"
                role="alert"
                data-testid="twofa-error"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || bootstrapping || code.length !== 6}
            >
              {submitting ? "Verifying…" : "Verify"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onCancel}
            >
              Cancel and Sign Out
            </Button>
          </form>
        </div>
      </section>
    </SiteShell>
  );
}
