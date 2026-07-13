import { MessageCircleQuestion, Sparkles, ArrowRight, Users2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toTitleCase } from "@/lib/title-case";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";


/**
 * FamilyMeetingPrepCard — meeting-prep questions grouped by audience
 * (case manager, school team, adult services, student partnership).
 * Mirrors the Report v2 `meeting_prep_questions` shape but framed for
 * the family walking into a PPT.
 */

export interface FamilyMeetingPrepData {
  meetingLabel?: string;
  meetingDate?: string;
  groups?: {
    forAudience: "case_manager" | "school" | "adult_services" | "student";
    label: string;
    questions: { question: string; why?: string }[];
  }[];
  prepHref?: string;
}

const SAMPLE: Required<FamilyMeetingPrepData> = {
  meetingLabel: "Annual PPT",
  meetingDate: "Sep 15",
  groups: [
    {
      forAudience: "case_manager",
      label: "For The Case Manager",
      questions: [
        {
          question:
            "How is Jordan progressing on transition goals compared to last review?",
          why: "Anchors the meeting in evidence, not opinion.",
        },
        {
          question:
            "Which accommodations will carry into a 2-year program, and how are we practicing them now?",
          why: "Sets up postsecondary handoff early.",
        },
        {
          question:
            "What transition assessment is coming next, and when will we see the results?",
          why: "The report flags this as a data gap.",
        },
      ],
    },
    {
      forAudience: "school",
      label: "For The School Team",
      questions: [
        {
          question:
            "How are self-advocacy skills being coached in the classroom?",
          why: "Family and educator both prioritized this.",
        },
        {
          question:
            "Can Jordan lead one section of the next meeting with prep support?",
          why: "Builds practice for postsecondary self-disclosure.",
        },
      ],
    },
    {
      forAudience: "adult_services",
      label: "For Adult Services / BRS",
      questions: [
        {
          question:
            "When should we apply to the Bureau of Rehabilitation Services, and what do we need to bring?",
          why: "Age-16+ eligibility — timing matters.",
        },
        {
          question:
            "Which programs cover travel training and job coaching after graduation?",
          why: "Independent-living plan depends on these supports.",
        },
      ],
    },
    {
      forAudience: "student",
      label: "For Jordan (With The Family)",
      questions: [
        {
          question:
            "Which strength do you most want the team to lead with in the meeting?",
          why: "Puts the student's voice at the top of the room.",
        },
        {
          question:
            "What's one worry you want the team to address on the record?",
          why: "Ensures concerns are documented, not just discussed.",
        },
      ],
    },
  ],
  prepHref: "/ppt-prep",
};

const AUDIENCE_STYLES: Record<
  Required<FamilyMeetingPrepData>["groups"][number]["forAudience"],
  string
> = {
  case_manager: "bg-primary/10 text-primary ring-primary/20",
  school: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
  adult_services:
    "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  student: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
};

export function FamilyMeetingPrepCard({
  data,
  isSample = true,
  empty = false,
}: {
  data?: FamilyMeetingPrepData;
  isSample?: boolean;
  empty?: boolean;
}) {
  const d: Required<FamilyMeetingPrepData> = { ...SAMPLE, ...(data ?? {}) };
  const totalQuestions = d.groups.reduce((n, g) => n + g.questions.length, 0);
  const isEmpty = empty || totalQuestions === 0;


  return (
    <section
      aria-labelledby="family-meeting-prep-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="family-meeting-prep-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow flex items-center gap-1">
            <MessageCircleQuestion className="h-3 w-3" aria-hidden /> Meeting Prep
          </p>
          <h2
            id="family-meeting-prep-title"
            className="mt-1 font-display text-2xl font-medium tracking-tight"
          >
            {toTitleCase("Questions To Bring Into The Next Meeting")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {totalQuestions} questions organized by who to ask.{" "}
            {d.meetingLabel} · {d.meetingDate}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSample && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample Preview
            </span>
          )}
          <Link
            to={d.prepHref}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:border-primary hover:bg-primary/10"
          >
            Open Full Prep <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      {isEmpty ? (
        <ModuleEmptyState
          kind="meetings"
          eyebrow="Meeting Prep"
          title="No Meeting Prep Yet"
          description="Meeting-prep questions appear here as soon as your team schedules a PPT or your Pathway Report has priorities to translate."
          primaryAction={{ label: "Open Pathway Report", to: "/pathway/family" }}
          secondaryAction={{ label: "Add Family Priorities", to: "/family/priorities" }}
          className="mt-5"
        />
      ) : (
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {d.groups.map((g) => (
          <div
            key={g.label}
            className="flex h-full flex-col rounded-2xl border bg-background p-4"
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${AUDIENCE_STYLES[g.forAudience]}`}
              >
                <Users2 className="h-3 w-3" aria-hidden />
                {g.label}
              </span>
            </div>
            <ul className="mt-3 space-y-3">
              {g.questions.map((q, i) => (
                <li
                  key={i}
                  className="border-b border-dashed border-border/60 pb-3 last:border-b-0 last:pb-0"
                >
                  <p className="text-sm font-medium leading-snug text-foreground">
                    "{q.question}"
                  </p>
                  {q.why && (
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Why: {q.why}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      )}
    </section>
  );
}

