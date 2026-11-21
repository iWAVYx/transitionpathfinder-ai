import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles } from "@/lib/profile.functions";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";
import { dashboardHomeForRoles } from "@/lib/role-policy";

const neutralHome = { to: "/dashboard", label: "workspace" };

/** Mount within a viewer-keyed session. Metadata guides navigation, not authorization. */
export function useWorkspaceNavigation(viewerId: string | null) {
  const loadRoles = useServerFn(getMyRoles);
  const loadOwner = useServerFn(getMyAdminRoles);
  const [workspace, setWorkspace] = useState({
    loaded: false,
    roles: [] as string[],
    isPlatformAdmin: false,
    home: neutralHome,
  });
  useEffect(() => {
    if (!viewerId) return;
    let cancelled = false;
    const request = { data: { expected_viewer_id: viewerId } };
    Promise.allSettled([loadRoles(request), loadOwner(request)]).then(([profile, owner]) => {
      if (cancelled) return;
      const ownerVerified =
        owner.status === "fulfilled" && typeof owner.value?.isPlatformAdmin === "boolean";
      const isPlatformAdmin = ownerVerified && owner.value.isPlatformAdmin;
      const roles =
        ownerVerified &&
        profile.status === "fulfilled" &&
        Array.isArray(profile.value?.roles) &&
        profile.value.roles.every((role: unknown) => typeof role === "string")
          ? profile.value.roles
          : [];
      setWorkspace({
        loaded: true,
        roles,
        isPlatformAdmin,
        home:
          isPlatformAdmin || roles.length > 0
            ? dashboardHomeForRoles(roles, isPlatformAdmin)
            : neutralHome,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [viewerId, loadRoles, loadOwner]);
  return workspace;
}
