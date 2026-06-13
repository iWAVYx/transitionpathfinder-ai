import { Badge } from "@/components/ui/badge";
import { useEntitlement } from "@/hooks/use-entitlement";

const LABELS: Record<string, string> = {
  family_early_access: "Family Early Access",
  individual: "Individual",
  school_pilot: "School Pilot",
  school_plan: "School Plan",
  district_plan: "District Plan",
  partner_org: "Partner Network",
  comp: "Complimentary",
};

export function EntitlementBadge() {
  const { isActive, plan, viaDistrict, loading } = useEntitlement();
  if (loading) return null;
  if (!isActive) {
    return (
      <Badge variant="outline" className="text-xs">
        Access pending
      </Badge>
    );
  }
  const label = (plan && LABELS[plan]) || plan || "Active";
  return (
    <Badge variant="secondary" className="text-xs">
      {label}
      {viaDistrict ? " · via district" : ""}
    </Badge>
  );
}
