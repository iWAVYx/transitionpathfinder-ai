import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

import { TwoFactorVerification } from "@/components/auth/TwoFactorChallenge";

export const Route = createFileRoute("/login")({
  component: LoginLayout,
});

function LoginLayout() {
  const location = useLocation();

  // Defense-in-depth for the auth surface: /login/2fa must never fall through
  // to the email/password login UI, even if route generation or a stale bundle
  // temporarily treats it as part of the /login layout.
  if (location.pathname === "/login/2fa") {
    const redirect =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("redirect") || "/dashboard"
        : "/dashboard";
    return <TwoFactorVerification redirect={redirect} />;
  }

  return <Outlet />;
}