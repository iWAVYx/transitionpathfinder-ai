import { ContextualBackLink } from "@/components/navigation/NavigationOriginProvider";
import { DemoOptionalReportDocument } from "./DemoOptionalReportDocument";
import { useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { ReportPdfButton } from "@/components/documents/ReportPdfButton";

type Audience = "student" | "family" | "educator";
/** A section excerpt using product components; not a generated full report. */
export function DemoOptionalReportSections({ audience, builderRole }: { audience: Audience; builderRole: "family" | "educator" }) {
  const navigate = useNavigate();
  return <SiteShell><div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 print:contents">
    <ContextualBackLink to="/demo/report" search={{ example: "builder", role: builderRole, view: audience }} label="← Back to Sample Pathway Report" className="text-sm font-medium text-primary hover:underline print:hidden" />
    <div className="my-5 flex flex-wrap items-center gap-3 print:hidden" role="group" aria-label="Choose a sample section view">
      {(["student", "family", "educator"] as const).map(role => <button key={role} type="button" aria-pressed={audience === role}
        className="rounded-md border px-3 py-2 text-sm" onClick={() => void navigate({ to: "/demo/report", search: (previous: Record<string, unknown>) => ({ ...previous, view: role, role: role === "student" ? builderRole : role }), resetScroll: false })}>
        {role === "student" ? "Student" : role === "family" ? "Family" : "Educator"}
      </button>)}
      <ReportPdfButton />
    </div>
    <DemoOptionalReportDocument audience={audience} />
  </div></SiteShell>;
}
