/** An export must belong to the currently selected organization and window. */
export function reportExportReady(input: {
  loading: boolean;
  loadedOrganization: string | null;
  organization: string;
  window: { from: string | null; to: string | null } | null;
  from?: string;
  to?: string;
}) {
  const { window, from, to } = input;
  return !input.loading && !!window && input.loadedOrganization === input.organization &&
    window.from === (from ?? null) && window.to === (to ?? null) &&
    !(from && to && from > to);
}

/** Quote delimiters and keep untrusted text from becoming spreadsheet formulas. */
export function organizationCsvCell(value: unknown): string {
  let text = String(value ?? "");
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '\"\"')}"` : text;
}
