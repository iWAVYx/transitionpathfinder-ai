import type { ReactNode } from "react";
import { toTitleCase } from "@/lib/title-case";

/** Common pathway heading geometry; badges retain each source's recorded meaning. */
export function ReportPathwayHeading({ title, badges, as: Tag = "div" }: {
  title: string; badges: ReactNode; as?: "div" | "header";
}) {
  return <Tag data-report-pathway-heading className="flex flex-wrap items-start justify-between gap-2">
    <h3 style={{ margin: 0 }} className="min-w-0 text-sm font-semibold leading-snug sm:text-base">{toTitleCase(title)}</h3>
    <div data-report-pathway-badges className="flex min-w-0 max-w-full flex-wrap gap-1.5">{badges}</div>
  </Tag>;
}

export function ReportPathwaySummary({ children, kind }: { children: ReactNode; kind: "fit" | "summary" }) {
  return <p data-report-pathway-summary className={kind === "fit" ? "text-sm italic text-foreground/75" : "mt-2 text-sm text-foreground/90"}>{children}</p>;
}
