import type { ReactNode } from "react";

/** Repeat the supplied category label in print without duplicating source content. */
export function ReportCategoryContinuation({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  return <table role="presentation" data-report-profile-category-pages>
    <thead><tr><td>{heading}</td></tr></thead>
    <tbody><tr><td>{children}</td></tr></tbody>
  </table>;
}
