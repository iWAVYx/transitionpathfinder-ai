import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";

export const Route = createFileRoute("/_authenticated/owner")({
  beforeLoad: async () => {
    try {
      const res = await getMyAdminRoles();
      if (!res?.isPlatformAdmin) {
        throw redirect({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "isRedirect" in (err as object)) {
        throw err;
      }
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => <Outlet />,
});
