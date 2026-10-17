import type { ReactNode } from "react";

function isLongCategory(items: readonly string[]) {
  return items.some(item => item.length > 400) || items.reduce((length, item) => length + item.length, 0) > 1200;
}

/** Keep like-sized neighbors paired; give an unmatched category the full print row. */
export function profileCategoryPrintSpans(groups: readonly (readonly string[])[]) {
  const spans = groups.map(() => false);
  for (let index = 0; index < groups.length;) {
    const firstLong = isLongCategory(groups[index]);
    const next = groups[index + 1];
    const sameKind = next && firstLong === isLongCategory(next);
    const size = (items: readonly string[]) => items.reduce((total, item) => total + item.length, 0);
    const balanced = sameKind && (!firstLong || Math.max(size(groups[index]), size(next)) <= Math.min(size(groups[index]), size(next)) * 2);
    if (!balanced) {
      spans[index] = true;
      index++;
    } else index += 2;
  }
  return spans;
}

/** Repeat the supplied category label in print without duplicating source content. */
export function ReportCategoryContinuation({ heading, items = [], fullWidth, children }: { heading: ReactNode; items?: readonly string[]; fullWidth?: boolean; children: ReactNode }) {
  // These are print layout hints, not assessments or limits on recorded content.
  const long = isLongCategory(items);
  return <table role="presentation" data-report-profile-category-pages data-report-profile-wide={(fullWidth ?? long) || undefined} data-report-profile-long={long || undefined}>
    <thead><tr><td>{heading}</td></tr></thead>
    <tbody><tr><td>{children}</td></tr></tbody>
  </table>;
}
