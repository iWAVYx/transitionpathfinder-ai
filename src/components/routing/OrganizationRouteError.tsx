import { z } from "zod";
import type { ComponentType } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { selectionRouteErrorComponent } from "./SelectionRouteError";
export function organizationRouteErrorComponent(
  scope: "school" | "district",
  path: string,
  fallback?: ComponentType<ErrorComponentProps>,
) {
  const key = scope === "school" ? "org_id" : "district_id";
  return selectionRouteErrorComponent({
    path,
    fallback,
    testId: "organization-link-recovery",
    invalidKeys: (search) =>
      search[key] !== undefined && !z.string().uuid().safeParse(search[key]).success ? [key] : [],
    description:
      "The link contains a workspace selection that could not be read. Clear the invalid selection to reopen this tool. Other page settings will stay in place.",
  });
}
