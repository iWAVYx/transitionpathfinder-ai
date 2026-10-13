import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import { Loader2 } from "lucide-react";
import { getOrganizationHistoryRoster } from "@/lib/organization-history.functions";
import type {
  HistoryOrganization,
  OrganizationHistoryRoster,
} from "@/lib/organization-history.types";
import { useOrganizationDashboardSelection } from "@/hooks/use-organization-dashboard-selection";
import { OrganizationLoadError } from "@/components/dashboard/OrganizationLoadError";
import { StudentActivityHistory, type StudentActivityHistoryProps } from "./StudentActivityHistory";
const selectedId = (data: OrganizationHistoryRoster) => data.organization_id;
export function OrganizationActivityHistory({
  scope,
  ...props
}: StudentActivityHistoryProps & { scope: HistoryOrganization["scope"] }) {
  const read = useServerFn(getOrganizationHistoryRoster);
  const fetch = useCallback(
    (organization_id?: string) => read({ data: { scope, organization_id } }),
    [read, scope],
  );
  const state = useOrganizationDashboardSelection(
    scope,
    fetch,
    selectedId,
    "Student history could not be loaded.",
  );
  if (state.loading)
    return (
      <div role="status" className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading student history…
      </div>
    );
  if (!state.data)
    return (
      <OrganizationLoadError
        onRetry={() => void state.reload()}
        onRecoverSelection={state.recoverSelection}
      />
    );
  return (
    <StudentActivityHistory
      key={`${scope}:${state.data.organization_id}`}
      {...props}
      roster={state.data.students}
      organization={{ scope, id: state.data.organization_id }}
    />
  );
}
