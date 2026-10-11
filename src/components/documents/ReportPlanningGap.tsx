import type { HTMLAttributes, ReactNode } from "react";
import { toTitleCase } from "@/lib/title-case";

type Props = HTMLAttributes<HTMLElement> & {
  title: string;
  as?: "div" | "li";
  children: ReactNode;
};

/** Shared missing-information presentation; callers retain every recorded explanation and follow-up. */
export function ReportPlanningGap({ title, as: Container = "div", children, ...attributes }: Props) {
  return <Container {...attributes} data-report-planning-gap>
    <h3 data-report-gap-heading className="font-display text-lg">{toTitleCase(title)}</h3>
    {children}
  </Container>;
}
