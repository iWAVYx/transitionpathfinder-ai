export type ReportProfileGroup = { label: string; items: readonly string[] };

/** Display supplied profile information; empty categories do not imply an assessment. */
export function ReportProfileDetails({ groups }: { groups: ReportProfileGroup[] }) {
  const present = groups.filter(group => group.items.length > 0);
  if (present.length === 0) return null;
  return <div data-report-profile-details>
    {present.map(({ label, items }) => <div key={label} data-report-profile-group data-report-detail-row>
      <h3 className="text-primary">{label}</h3>
      <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
        {items.map((item, index) => <li key={index} className="flex gap-2">
          <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>)}
      </ul>
    </div>)}
  </div>;
}
