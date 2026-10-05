import { useEffect, useState } from "react";
import { DashboardWidgetBoardView } from "@/components/dashboard/DashboardWidgetBoardView";
import {
  WIDGETS_BY_ROLE,
  widgetsForRole,
  type DashboardWidgetRole,
  type DashboardWidgetId,
} from "@/lib/dashboard/dashboard-widget-prefs.functions";
import { DEMO_NEXT_ACTIONS } from "@/lib/next-actions/demo-fixtures";
import type { NextActionRole } from "@/lib/next-actions/types";
import { schoolWidgetActions, districtWidgetActions } from "@/lib/demo/organization-widget-actions";
import { useDemoSchool, useDemoDistrict } from "@/lib/demo/use-role-context";
import { useDemoStudent } from "@/lib/demo/use-demo-student";
import { planningWidgetContent } from "@/lib/demo/planning-widget-content";
import type { DemoRoleId } from "@/lib/demo/role-previews";

export function DemoDashboardWidgets({ role }: { role: Exclude<DemoRoleId, "owner"> }) {
  const { profile } = useDemoStudent();
  const { school } = useDemoSchool();
  const { district } = useDemoDistrict();
  const widgetRole = role.replaceAll("-", "_") as DashboardWidgetRole;
  const [widgets, setWidgets] = useState<DashboardWidgetId[]>(WIDGETS_BY_ROLE[widgetRole]);
  const key = `demo-dashboard-widgets:${role}`;
  useEffect(() => {
    try {
      setWidgets(widgetsForRole(JSON.parse(sessionStorage.getItem(key) ?? "null"), widgetRole));
    } catch {
      setWidgets(WIDGETS_BY_ROLE[widgetRole]);
    }
  }, [key, widgetRole]);
  const update = (next: DashboardWidgetId[]) => {
    setWidgets(next);
    try {
      sessionStorage.setItem(key, JSON.stringify({ [widgetRole]: next }));
    } catch {
      /* browser storage may be unavailable */
    }
  };
  const actions = DEMO_NEXT_ACTIONS[widgetRole as NextActionRole] ?? [];
  return (
    <DashboardWidgetBoardView
      role={widgetRole}
      sample
      widgets={widgets}
      available={WIDGETS_BY_ROLE[widgetRole]}
      update={update}
      data={
        role === "student" || role === "family" || role === "educator"
          ? planningWidgetContent(role, profile)
          : {
              actions: {
                entries:
                  role === "school-admin"
                    ? schoolWidgetActions(school)
                    : role === "district-admin"
                      ? districtWidgetActions(district)
                      : actions
                          .filter((action) => action.status !== "completed")
                          .slice(0, 5)
                          .map((action) => ({
                            id: action.id,
                            title: action.title,
                            detail: action.dueLabel ?? action.reason,
                            to: action.ctaRoute,
                          })),
                toolDestination: actions[0]?.ctaRoute ?? `/demo/${role}`,
              },
              calendar: { entries: [], toolDestination: `/demo/feature/${role}/calendar` },
              meetings: { entries: [], toolDestination: `/demo/feature/${role}/meeting-prep` },
            }
      }
    />
  );
}
