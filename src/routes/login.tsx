import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

import { TwoFactorVerification } from "@/components/auth/TwoFactorChallenge";

export const Route = createFileRoute("/login")({
  component: LoginLayout,
});

function LoginLayout() {
  const location = useLocation();
  if (location.pathname === "/login/2fa") {
    const redirect = new URLSearchParams(location.searchStr).get("redirect") || "/dashboard";
    return <TwoFactorVerification redirect={redirect} />;
  }
  return <Outlet />;
}