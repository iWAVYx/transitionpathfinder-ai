import { useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  redeemAccessCode,
  type RedeemAccessCodeResult,
} from "@/lib/access-codes.functions";

const FAILURE_MESSAGES: Record<
  Exclude<RedeemAccessCodeResult, { ok: true }>["reason"],
  string
> = {
  invalid_code: "Enter the full license code from your school or district.",
  unknown_code: "We could not find that license code. Check the spelling and try again.",
  revoked: "That license code has been revoked. Ask your administrator for a new one.",
  expired: "That license code has expired. Ask your administrator for a new one.",
  over_capacity:
    "Every seat reserved for that code has been claimed. Your administrator can issue another code or add capacity.",
  already_redeemed: "This account already activated that license code.",
  role_mismatch:
    "That code was issued for a different account type. Ask your administrator for a code that matches this account.",
  unknown_error: "We could not activate the license right now. Please try again.",
};

function roleLabel(role: string | null | undefined): string | null {
  if (!role) return null;
  const normalized = role === "parent" ? "Family" : role.replaceAll("_", " ");
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function LicenseActivationPanel({
  primaryRole,
  variant = "settings",
  successAction,
}: {
  primaryRole?: string | null;
  variant?: "settings" | "page";
  successAction?: ReactNode;
}) {
  const redeem = useServerFn(redeemAccessCode);
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RedeemAccessCodeResult | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    try {
      const next = await redeem({ data: { code } });
      setResult(next);
      if (next.ok) {
        setCode("");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["my-sponsorship"] }),
          queryClient.invalidateQueries({ queryKey: ["personal-billing"] }),
        ]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const complete = result?.ok === true || result?.reason === "already_redeemed";
  const currentRole = roleLabel(primaryRole);
  const requiredRole =
    result && !result.ok && result.reason === "role_mismatch"
      ? roleLabel(result.required_role)
      : null;
  const accountRole =
    result && !result.ok && result.reason === "role_mismatch"
      ? roleLabel(result.account_role ?? primaryRole)
      : currentRole;
  const Heading = variant === "page" ? "h1" : "h2";

  return (
    <div
      className={
        variant === "settings"
          ? "rounded-2xl border bg-card p-6 shadow-soft"
          : undefined
      }
    >
      <div className="flex items-center gap-2 text-primary">
        {complete ? (
          <CheckCircle2 className="h-5 w-5" aria-hidden />
        ) : (
          <KeyRound className="h-5 w-5" aria-hidden />
        )}
        <Heading
          className={
            variant === "page"
              ? "font-display text-3xl font-medium tracking-tight"
              : "font-display text-lg"
          }
        >
          {complete ? "License Activated" : "Activate A License"}
        </Heading>
      </div>

      {complete ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your school or district now covers the eligible features on this
            account. Your profile and work stay with you while the sponsored
            seat remains active.
          </p>
          {successAction}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter a code provided by your school or district instead of buying
            an individual subscription. The code must match your account type
            and have an available reserved seat.
          </p>
          {currentRole ? (
            <p className="text-xs font-medium text-foreground">
              Account Type: {currentRole}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor={`license-code-${variant}`}>License Code</Label>
            <Input
              id={`license-code-${variant}`}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setResult(null);
              }}
              autoComplete="one-time-code"
              placeholder="TF-XXXX-XXXX-XXXX"
              maxLength={128}
              required
            />
          </div>
          {result && !result.ok ? (
            <div role="alert" className="space-y-1 text-sm text-destructive">
              <p>{FAILURE_MESSAGES[result.reason]}</p>
              {result.reason === "role_mismatch" && requiredRole ? (
                <p className="text-xs">
                  This is a {accountRole ?? "different"} account; the code is
                  for {requiredRole} access.
                </p>
              ) : null}
            </div>
          ) : null}
          <Button type="submit" disabled={submitting || !code.trim()}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden />
            )}
            Activate License
          </Button>
        </form>
      )}
    </div>
  );
}
