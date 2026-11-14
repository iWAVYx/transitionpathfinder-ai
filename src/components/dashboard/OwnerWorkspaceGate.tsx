import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";

export function OwnerWorkspaceGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const scopeKey = JSON.stringify([user?.id ?? null, !!loading]);
  const currentKey = useRef(scopeKey);
  currentKey.current = scopeKey;
  if (loading || !user) return <OwnerGateShell />;
  return (
    <OwnerGateSession key={scopeKey} viewerId={user.id} scopeKey={scopeKey} currentKey={currentKey}>
      {children}
    </OwnerGateSession>
  );
}
function OwnerGateSession({
  viewerId,
  scopeKey,
  currentKey,
  children,
}: {
  viewerId: string;
  scopeKey: string;
  currentKey: { current: string };
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const fetchAdminRoles = useServerFn(getMyAdminRoles);
  const [status, setStatus] = useState<"checking" | "allowed" | "error">("checking");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const current = () => !cancelled && currentKey.current === scopeKey;
    fetchAdminRoles({ data: { expected_viewer_id: viewerId } })
      .then(async (admin) => {
        if (!current()) return;
        if (typeof admin?.isPlatformAdmin !== "boolean")
          throw new Error("Invalid workspace response");
        if (admin.isPlatformAdmin) {
          await navigate({ to: "/owner", replace: true });
          return;
        }
        setStatus("allowed");
      })
      .catch(() => {
        if (current()) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [viewerId, scopeKey, currentKey, fetchAdminRoles, navigate, retry]);
  if (status === "allowed") return <>{children}</>;
  return (
    <OwnerGateShell
      error={status === "error"}
      retry={() => {
        setStatus("checking");
        setRetry((value) => value + 1);
      }}
    />
  );
}
function OwnerGateShell({ error, retry }: { error?: boolean; retry?: () => void }) {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-10" role={error ? "alert" : "status"}>
        <p>{error ? "Could not confirm your workspace." : "Opening your workspace…"}</p>
        {error && (
          <Button className="mt-3" onClick={retry}>
            Try again
          </Button>
        )}
      </div>
    </SiteShell>
  );
}
