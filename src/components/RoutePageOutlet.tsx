import { Outlet, useChildMatches } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Keep a route's landing page without masking any matched detail route. */
export function RoutePageOutlet({ children }: { children: ReactNode }) {
  const hasChild = useChildMatches({ select: (matches) => matches.length > 0 });
  return hasChild ? <Outlet /> : children;
}
