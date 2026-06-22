import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

import { TwoFactorVerification } from "@/components/auth/TwoFactorChallenge";

export const Route = createFileRoute("/login")({
  component: LoginLayout,
});

function LoginLayout() {
  const location = useLocation();
  if (location.pathname.startsWith("/login/2fa")) {
    const params = new URLSearchParams(location.searchStr);
    return <TwoFactorVerification redirect={params.get("redirect") || "/dashboard"} />;
  }

  return <Outlet />;
}