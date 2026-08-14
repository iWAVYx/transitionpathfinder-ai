import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthRenderDiagnostic } from "@/components/auth/AuthRenderDiagnostic";
import { supabase } from "@/integrations/supabase/client";

export function TwoFactorVerification({ redirect }: { redirect: string }) {
  const navigate = useNavigate();
  const safeRedirect = normalizeChallengeRedirect(redirect);
  const isStandaloneChallengeRoute =
    typeof window !== "undefined" && window.location.pathname.startsWith("/login/2fa");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [authResolution, setAuthResolution] = useState<"pending" | "ready" | "redirecting">("pending");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Two-Factor Verification — TransitionForward";
  }, []);

  useEffect(() => {
    let cancelled = false;
    const bounceToLogin = async () => {
      if (isStandaloneChallengeRoute) {
        if (!cancelled) {
          setAuthResolution("ready");
          setBootstrapping(false);
        }
        return;
      }
      if (!cancelled) setAuthResolution("redirecting");
      await supabase.auth.signOut().catch(() => undefined);
      if (!cancelled) {
        navigate({ to: "/login", search: { redirect: safeRedirect, mfa: "expired" }, replace: true });
      }
    };

    (async () => {
      const session = await waitForMfaSession();
      if (!session) {
        await bounceToLogin();
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled) return;
      if (aal?.currentLevel === "aal2") {
        setAuthResolution("redirecting");
        navigate({ to: safeRedirect, replace: true });
        return;
      }

      if (aal?.nextLevel !== "aal2") {
        await bounceToLogin();
        return;
      }

      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (factorsError) {
        setError(factorsError.message);
        setBootstrapping(false);
        return;
      }

      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (!totp) {
        await bounceToLogin();
        return;
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (cancelled) return;
      if (challengeError || !challenge) {
        await bounceToLogin();
        return;
      }

      setFactorId(totp.id);
      setChallengeId(challenge.id);
      setAuthResolution("ready");
      setBootstrapping(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isStandaloneChallengeRoute, navigate, safeRedirect]);

  useEffect(() => {
    if (!bootstrapping) inputRef.current?.focus();
  }, [bootstrapping]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCode = code.replace(/\D/g, "").slice(0, 6);
    if (!factorId || !challengeId || normalizedCode.length !== 6) return;
    setSubmitting(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: normalizedCode,
    });

    if (verifyError) {
      setError(verifyError.message);
      setSubmitting(false);
      setCode("");
      const { data: fresh } = await supabase.auth.mfa.challenge({ factorId });
      if (fresh) setChallengeId(fresh.id);
      return;
    }

    toast.success("Verified");
    navigate({ to: safeRedirect, replace: true });
  };

  const onCancel = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", search: { redirect: "/dashboard" }, replace: true });
  };

  return (
    <>
      <AuthRenderDiagnostic
        branch="TwoFactorVerification"
        loginFormRendered={false}
        pendingChallengeExists={Boolean(challengeId)}
        twoFactorVerificationRendered
      />
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12 text-foreground" data-testid="two-factor-page">
        <section className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
          <Link to="/" className="text-xs font-semibold uppercase tracking-wider text-primary">
            TransitionForward
          </Link>
          <h1 className="mt-4 font-display text-3xl font-medium tracking-tight text-foreground">
            Two-Factor Verification
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground" id="twofa-instructions">
            Open your authenticator app and enter the six-digit code.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-5" data-testid="totp-form">
            <div role="status" aria-live="polite" className="sr-only" data-testid="twofa-status">
              {bootstrapping ? "Preparing Two-Factor Challenge" : error ? `Error: ${error}` : "Ready for your six-digit code"}
            </div>

          <div>
            <label htmlFor="totp-code-input" className="text-sm font-medium text-foreground">
              Authenticator Code
            </label>
            <Input
              ref={inputRef}
              id="totp-code-input"
              name="otp"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
              disabled={authResolution === "redirecting" || submitting}
              aria-label="Six-digit authenticator code"
              aria-describedby="twofa-instructions"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="mt-2 h-12 text-center text-lg tracking-[0.18em]"
              data-testid="totp-code"
            />
          </div>

          {error && (
            <p className="text-center text-xs text-destructive" role="alert" data-testid="twofa-error">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || bootstrapping || code.replace(/\D/g, "").length !== 6}
            data-testid="totp-submit"
          >
            {submitting ? "Verifying…" : "Verify"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
            Use A Different Account
          </Button>
          </form>
        </section>
      </main>
    </>
  );
}

export const TwoFactorChallenge = TwoFactorVerification;

function normalizeChallengeRedirect(value: string) {
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//") || value.startsWith("/login")) return "/dashboard";
  return value;
}

async function waitForMfaSession() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return null;
}