import { CalendarClock, ExternalLink } from "lucide-react";

const GUIDANCE = [
  {
    label: "Connecticut Reporting Calendar",
    href: "https://portal.ct.gov/sde/performance/data-collections-guide",
    detail:
      "Open state data-collection guidance and the calendar for the current reporting year.",
  },
  {
    label: "Connecticut State Performance Plan",
    href: "https://portal.ct.gov/sde/special-education/state-performance-plan-spp-and-annual-performance-report-apr",
    detail:
      "Read the state's information about special education performance indicators and annual reporting.",
  },
];

export function ReportingDeadlinesCard({ scope }: { scope: "district" | "school" }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h2 className="font-medium">Reporting Deadlines</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        No confirmed reporting dates are connected to this {scope} workspace. Confirm dates with
        your district's reporting calendar.
      </p>
      <ul className="mt-4 space-y-3">
        {GUIDANCE.map((item) => (
          <li key={item.href} className="rounded-xl border p-3">
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
            >
              {item.label}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
