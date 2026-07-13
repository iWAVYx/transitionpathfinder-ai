import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";

/**
 * Educator "Pending Input" — filtered view showing sections of Pathway
 * Reports waiting on this educator's input. Deep-links into
 * /teacher-portal per section rather than dumping into the generic portal.
 */
export const Route = createFileRoute("/_authenticated/educator/pending-input")({
  head: () => ({
    meta: [
      { title: "Pending Educator Input — TransitionForward" },
      {
        name: "description",
        content:
          "Sections of your students' Pathway Reports waiting on your input before they can move to draft.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/educator/pending-input">
      <PendingInputPage />
    </RoleGuard>
  ),
});

type Pending = {
  student: string;
  grade: string;
  section: string;
  due: string;
  overdue?: boolean;
};

const PENDING: Pending[] = [
  { student: "Jordan M.", grade: "G11", section: "Employment strengths & interests", due: "Sep 14" },
  { student: "Jordan M.", grade: "G11", section: "Postsecondary education recommendations", due: "Sep 14" },
  { student: "Marcus T.", grade: "G12", section: "Adult services handoff notes", due: "Sep 10", overdue: true },
  { student: "Ana R.", grade: "G10", section: "Present levels of academic performance", due: "Sep 18" },
];

function PendingInputPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Breadcrumbs trail={[{ label: "Caseload", to: "/hubs/caseload" }, { label: "Pending Input" }]} />
        <header className="mt-4 mb-8">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-7 w-7 text-primary" aria-hidden />
            <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Pending Educator Input
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Report sections waiting on your input. Click a section to jump straight
            into the teacher portal for that student and field.
          </p>
        </header>

        <ul className="divide-y divide-border rounded-2xl border bg-card shadow-soft">
          {PENDING.map((p, i) => (
            <li key={i} className="flex items-start justify-between gap-4 p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {p.student} <span className="text-xs text-muted-foreground">· {p.grade}</span>
                  </p>
                  {p.overdue && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive ring-1 ring-destructive/20">
                      <AlertCircle className="h-3 w-3" aria-hidden /> Overdue
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.section}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Due {p.due}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/teacher-portal">
                  Add Input <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/hubs/caseload">
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back To Caseload
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/teacher-portal">Open Teacher Portal</Link>
          </Button>
        </div>
      </main>
    </SiteShell>
  );
}
