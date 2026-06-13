import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyEntitlement } from "@/lib/entitlements.functions";

export type EntitlementSummary = {
  isActive: boolean;
  plan: string | null;
  viaDistrict: boolean;
  features: { family: boolean; student: boolean; partner: boolean };
};

/**
 * Reads the current user's effective entitlement (with district inheritance).
 * Returns a stable shape during loading so dashboards can render staged
 * empty states without flicker.
 */
export function useEntitlement() {
  const fetchEntitlement = useServerFn(getMyEntitlement);
  const [summary, setSummary] = useState<EntitlementSummary>({
    isActive: false,
    plan: null,
    viaDistrict: false,
    features: { family: false, student: false, partner: false },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchEntitlement()
      .then((r) => {
        if (cancelled) return;
        setSummary(r.summary as EntitlementSummary);
      })
      .catch(() => {
        /* leave the default inactive summary in place */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchEntitlement]);

  return { ...summary, loading } as const;
}
