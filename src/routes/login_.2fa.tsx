import { createFileRoute } from "@tanstack/react-router";

import { AuthRenderDiagnostic } from "@/components/auth/AuthRenderDiagnostic";
import { TwoFactorVerification } from "@/components/auth/TwoFactorChallenge";

export const Route = createFileRoute("/login_/2fa")({
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
  return (
    <>
      <AuthRenderDiagnostic
        branch="TwoFactorVerification"
        loginFormRendered={false}
        twoFactorVerificationRendered
      />
      <TwoFactorVerification redirect={redirect} />
    </>
  );
}
