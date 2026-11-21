import { selectionRouteErrorComponent } from "@/components/routing/SelectionRouteError";
import { invalidHistorySelectionKeys, type HistoryRouteRole } from "@/lib/history-navigation";
export function historyRouteErrorComponent(role: HistoryRouteRole) {
  return selectionRouteErrorComponent({
    path: `/${role}/history`,
    invalidKeys: (search) => invalidHistorySelectionKeys(role, search),
    testId: "history-link-recovery",
    description:
      "The link contains a student or workspace selection that could not be read. Clear the invalid selections to reopen history. Valid selections and other page settings will stay in place.",
  });
}
