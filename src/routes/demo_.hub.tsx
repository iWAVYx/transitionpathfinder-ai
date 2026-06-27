import { createFileRoute, Link } from "@tanstack/react-router";
import { StudioPage } from "@/studio/StudioPage";
import {
  ClipboardList,
  Mic,
  FileSearch,
  FileText,
  Briefcase,
  BookOpen,
  Users,
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  Compass,
} from "lucide-react";

import { validateStudentSearch } from "@/components/site/DemoStepBar";
import { getDemoStudent } from "@/lib/demo-data";
import { CHAPTER_META } from "@/lib/demo-chapters";
import { toTitleCase } from "@/lib/title-case";
import {
  PublicationCallout, PublicationSpread, PublicationSidebar,
} from "@/components/publication/PublicationPage";
export const Route = createFileRoute("/demo_/hub")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Sample Student Hub — TransitionForward Demo" },
      {
        name: "description",
        content:
          "The ongoing student workspace where families and educators track goals, documents, and progress in one place.",
      },
      { property: "og:url", content: "/demo/hub" },
    ],
    links: [{ rel: "canonical", href: "/demo/hub" }],
  }),
  component: DemoHubPage,
});

const STEP_ICONS: Record<string, React.ReactNode> = {
  intake:       <ClipboardList className="h-4 w-4" />,
  voice:        <Mic className="h-4 w-4" />,
  documents:    <FileSearch className="h-4 w-4" />,
  report:       <FileText className="h-4 w-4" />,
  opportunities:<Briefcase className="h-4 w-4" />,
  resources:    <BookOpen className="h-4 w-4" />,
  meeting:      <Users className="h-4 w-4" />,
  calendar:     <CalendarDays className="h-4 w-4" />,
  plan:         <CalendarRange className="h-4 w-4" />,
  hub:          <LayoutDashboard className="h-4 w-4" />,
  next:         <Compass className="h-4 w-4" />,
};

function DemoHubPage() {
  const search = Route.useSearch();
  const s = search.s ?? DEFAULT_DEMO_STUDENT;
  const preservedStudentSearch = demoStudentSearch(search.s);
  const bundle = getDemoStudent(s);
  const { profile: student } = bundle;

  return (
    <StudioPage stage="hub" student={s} preserveStudent={!!search.s} title="Workspace Index" dek={`A guided tour of ${toTitleCase(student.full_name)}'s pathway workspace.`}>
          <PublicationSpread
            lead={
              <>
                <h2>About This Workspace</h2>
                <p className="text-sm leading-relaxed text-foreground/80 mb-6">
                  The TransitionForward workspace is organized as a series of linked
                  chapters — each one capturing a different layer of {student.first_name}'s
                  transition plan. Read them in order, or jump to any chapter below.
                </p>

                <h2>Table Of Contents</h2>

                <ol className="mt-2 divide-y divide-[color:var(--pub-rule-soft)]">
                  {DEMO_STEPS.map((step, idx) => {
                    const chapterKey = step.id as keyof typeof CHAPTER_META;
                    const chapterInfo = CHAPTER_META[chapterKey];
                    const isCurrent = step.id === "hub";
                    return (
                      <li key={step.id} className={`py-4 ${isCurrent ? "opacity-60" : ""}`}>
                        <Link
                          to={step.to as "/demo/intake"}
                          {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                          className="group flex items-start gap-4"
                        >
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary group-hover:bg-primary/20 transition-colors">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-primary/60">
                                {STEP_ICONS[step.id]}
                              </span>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                {chapterInfo?.kicker ?? step.label}
                              </p>
                            </div>
                            <p className="mt-1 font-display text-base group-hover:text-primary transition-colors">
                              {toTitleCase(step.label)}
                            </p>
                            {chapterInfo?.dek && (
                              <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                                {chapterInfo.dek}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground/60 mt-1">
                            p.&nbsp;{chapterInfo?.page ?? "—"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </>
            }
            side={
              <>
                <PublicationSidebar label="About This Student">
                  <p className="font-display text-base">{toTitleCase(student.full_name)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {student.pronouns} · {student.grade}
                  </p>
                  <p className="text-sm text-muted-foreground">{student.school}</p>
                  <p className="text-sm text-muted-foreground mt-2">{bundle.headline}</p>
                </PublicationSidebar>

                <PublicationCallout kind="means" title="How The Workspace Is Organized">
                  Each chapter feeds the next. Intake and Student Voice anchor the
                  Pathway Report; the Report drives Meeting Prep, the Calendar, and the
                  30-Day Plan. The workspace stays live between meetings.
                </PublicationCallout>

                <PublicationCallout kind="next">
                  Start at Chapter&nbsp;1 — Intake — if this is your first visit. Everything
                  else builds from what the team shares there.
                </PublicationCallout>
              </>
            }
          />
        </StudioPage>
  );
}
