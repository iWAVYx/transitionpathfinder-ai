import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";

export function OwnerWorkspaceGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchAdminRoles = useServerFn(getMyAdminRoles);
  const [checkedUser, setCheckedUser] = useState<string | null>(null);
  const [ownerCheckError, setOwnerCheckError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setOwnerCheckError(false);
    if (!user?.id) return;
    fetchAdminRoles().then(({ isPlatformAdmin }) => {
      if (cancelled) return;
      if (isPlatformAdmin) {
        navigate({ to: "/owner", replace: true });
        return;
      }
      setCheckedUser(user.id);
    }).catch(() => {
      if (!cancelled) setOwnerCheckError(true);
    });
    return () => { cancelled = true; };
  }, [user?.id, fetchAdminRoles, navigate, retry]);

  if (checkedUser !== user?.id || !user) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-6xl px-4 py-10" role="status">
          <p>{ownerCheckError ? "Could not confirm your workspace." : "Opening your workspace…"}</p>
          {ownerCheckError && <Button className="mt-3" onClick={() => setRetry((value) => value + 1)}>Try again</Button>}
        </div>
      </SiteShell>
    );
  }
  return <>{children}</>;
}
