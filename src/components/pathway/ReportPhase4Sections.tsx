import {
  Megaphone,
  Home,
  ClipboardList,
  FileSearch,
  Quote,
  GraduationCap,
  Users,
  MessageSquareQuote,
} from "lucide-react";

import {
  DEMO_VOICE,
  DEMO_DOCUMENT_SOURCES,
  DEMO_INTAKE_CATEGORIES,
} from "@/lib/demo-extras";
import type { DemoStudentId } from "@/lib/demo-data";

export type Phase4Audience = "student" | "family" | "educator";

const PHASE4_TOC: { id: string; label: string }[] = [
  { id: "sec-self-advocacy-readiness", label: "Self-Advocacy Readiness" },
  { id: "sec-independent-living-readiness", label: "Independent Living Readiness" },
  { id: "sec-role-next-steps", label: "Next Steps for You" },
  { id: "sec-source-notes", label: "Sources & Information Used" },
];

export function getPhase4TocItems() {
  return PHASE4_TOC;
}

/* ------------------------------------------------------------------ */
/* Shared layout primitives — visually consistent with ReportView      */
/* ------------------------------------------------------------------ */

function Section({
  id,
  title,
  icon,
  intro,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="report-section mt-10 scroll-mt-24 page-break">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 className="font-display text-2xl font-medium tracking-tight">{title}</h2>
      </div>
      {intro && (
        <p className="mb-4 text-sm text-muted-foreground">{intro}</p>
      )}
      {children}
    </section>
  );
}

function Card({
  label,
  children,
  accent,
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border p-5 " +
        (accent ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card")
      }
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
      <div className="mt-2 text-sm leading-relaxed text-foreground/85">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Derivation helpers                                                  */
/* ------------------------------------------------------------------ */

function deriveSelfAdvocacy(studentId: DemoStudentId) {
  const voice = DEMO_VOICE[studentId] ?? [];
  const intake = DEMO_INTAKE_CATEGORIES[studentId] ?? [];

  const advocacyVoice = voice.filter((v) =>
    /ask for help|adults to understand|meeting|comfortable|struggle/i.test(v.prompt),
  );
  const advocacyIntake = intake.find((c) => /Self-Advocacy/i.test(c.category));
  const meetingIntake = intake.find((c) => /Meeting Confidence/i.test(c.category));

  return { advocacyVoice, advocacyIntake, meetingIntake };
}

function deriveIndependentLiving(studentId: DemoStudentId) {
  const voice = DEMO_VOICE[studentId] ?? [];
  const intake = DEMO_INTAKE_CATEGORIES[studentId] ?? [];

  const livingVoice = voice.find((v) =>
    /on your own|still need help/i.test(v.prompt),
  );
  const independent = intake.find((c) => /Independent Living/i.test(c.category));
  const transport = intake.find((c) => /Transportation/i.test(c.category));
  const support = intake.find((c) => /Support Preferences/i.test(c.category));

  return { livingVoice, independent, transport, support };
}

const ROLE_NEXT_STEPS: Record<
  Phase4Audience,
  Record<DemoStudentId, { icon: React.ReactNode; title: string; steps: string[] }>
> = {
  student: {
    jordan: {
      icon: <MessageSquareQuote className="h-5 w-5" />,
      title: "Your next steps, Jordan",
      steps: [
        "Pick one credentialed audio/video program to visit before the next PPT.",
        "Practice opening the next meeting yourself — one sentence about what you've made.",
        "Set up your digital planner this week and check it every morning for 10 days.",
      ],
    },
    maya: {
      icon: <MessageSquareQuote className="h-5 w-5" />,
      title: "Your next steps, Maya",
      steps: [
        "Visit the daycare site once before your first shadow day.",
        "Practice your one-sentence opener for the meeting with your family.",
        "Try the bus route to school with a trusted adult, then ride it solo once.",
      ],
    },
  },
  family: {
    jordan: {
      icon: <Users className="h-5 w-5" />,
      title: "Your next steps as Jordan's family",
      steps: [
        "Help Jordan schedule one credential-program tour in the next 30 days.",
        "Sit beside Jordan when he sets up his digital planner — don't take it over.",
        "Bring the IEP + transition assessment to the next PPT and ask about portfolio time.",
      ],
    },
    maya: {
      icon: <Users className="h-5 w-5" />,
      title: "Your next steps as Maya's family",
      steps: [
        "Call the daycare to arrange a visit before the first shadow day.",
        "Walk the bus route with Maya twice this month before she rides solo.",
        "Bring the Vocational Profile to the next PPT and ask about a transportation plan.",
      ],
    },
  },
  educator: {
    jordan: {
      icon: <GraduationCap className="h-5 w-5" />,
      title: "Your next steps as Jordan's case manager",
      steps: [
        "Draft a student-led PPT agenda — open with Jordan's portfolio share.",
        "Confirm executive-function accommodations (visual scaffolds, short deadlines) before the meeting.",
        "Coordinate a credential-program tour and add a follow-up calendar event.",
      ],
    },
    maya: {
      icon: <GraduationCap className="h-5 w-5" />,
      title: "Your next steps as Maya's case manager",
      steps: [
        "Set up the first travel-training session with the route Maya named.",
        "Confirm visit-first protocol with the daycare placement.",
        "Add processing-time accommodation language to the draft IEP goals.",
      ],
    },
  },
};

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function ReportPhase4Sections({
  studentId,
  audience,
  reportId,
  preparedBy,
  issued,
}: {
  studentId: DemoStudentId;
  audience: Phase4Audience;
  reportId?: string;
  preparedBy?: string;
  issued?: string;
}) {
  const { advocacyVoice, advocacyIntake, meetingIntake } = deriveSelfAdvocacy(studentId);
  const { livingVoice, independent, transport, support } = deriveIndependentLiving(studentId);
  const sources = DEMO_DOCUMENT_SOURCES[studentId] ?? [];
  const intake = DEMO_INTAKE_CATEGORIES[studentId] ?? [];
  const next = ROLE_NEXT_STEPS[audience][studentId];

  // Split "on your own" / "still need help" voice response.
  const parseLiving = (text?: string) => {
    if (!text) return { strengths: "", needs: "" };
    const m = text.match(/On my own:\s*(.+?)\.\s*Still need help:?\s*(.+)/i);
    return m ? { strengths: m[1], needs: m[2] } : { strengths: text, needs: "" };
  };
  const living = parseLiving(livingVoice?.response);

  return (
    <>
      {/* ============ Self-Advocacy Readiness ============ */}
      <Section
        id="sec-self-advocacy-readiness"
        title="Self-Advocacy Readiness"
        icon={<Megaphone className="h-5 w-5" />}
        intro="How this student speaks up for what they need — and the scaffolds that help them do it."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {advocacyIntake && (
            <Card label="Where it stands today">
              {advocacyIntake.answer}
            </Card>
          )}
          {meetingIntake && (
            <Card label="At meetings">
              {meetingIntake.answer}
            </Card>
          )}
        </div>

        {advocacyVoice.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {advocacyVoice.slice(0, 3).map((v, i) => (
              <figure
                key={i}
                className="rounded-2xl border border-border/60 bg-muted/30 p-5"
              >
                <Quote className="h-4 w-4 text-primary" />
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  {v.prompt}
                </p>
                <blockquote className="mt-1 font-display text-base italic leading-snug text-foreground/85">
                  "{v.response}"
                </blockquote>
                <figcaption className="mt-2 text-xs text-muted-foreground">
                  Shapes: {v.affects}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Section>

      {/* ============ Independent Living Readiness ============ */}
      <Section
        id="sec-independent-living-readiness"
        title="Independent Living Readiness"
        icon={<Home className="h-5 w-5" />}
        intro="What this student already does on their own, what they're working toward, and the supports that get them there."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Card label="Doing on their own" accent>
            {living.strengths || independent?.answer || "—"}
          </Card>
          <Card label="Still working on">
            {living.needs || "—"}
          </Card>
          {transport && <Card label="Transportation">{transport.answer}</Card>}
          {support && <Card label="What supports them best">{support.answer}</Card>}
        </div>
      </Section>

      {/* ============ Role-Specific Next Steps ============ */}
      <Section
        id="sec-role-next-steps"
        title={next.title}
        icon={next.icon}
        intro="Tailored to the view you're reading — switch views above to see the same plan from a different seat at the table."
      >
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <ol className="space-y-3">
            {next.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground/90">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ============ Source Notes / Information Used ============ */}
      <Section
        id="sec-source-notes"
        title="Sources & Information Used"
        icon={<FileSearch className="h-5 w-5" />}
        intro="A transparent index of every input this report draws from. No source = no claim."
      >
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Documents reviewed
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {sources.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>
                      <span className="font-medium text-foreground/90">{s.label}</span>
                      <span className="text-muted-foreground"> · {s.docType} · {s.pages} pp · {s.uploadedBy}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Intake inputs
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {intake.slice(0, 6).map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>
                      <span className="font-medium text-foreground/90">{c.category}</span>
                      <span className="text-muted-foreground"> → {c.flowsTo}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-border/60 pt-5 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Student Voice
              </p>
              <p className="mt-1 text-sm text-foreground/85">
                {(DEMO_VOICE[studentId] ?? []).length} reflection prompts answered
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Prepared By
              </p>
              <p className="mt-1 text-sm text-foreground/85">
                {preparedBy ?? "TransitionForward (AI-supported, human-reviewed)"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Document
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {reportId ?? "—"} · {issued ?? "—"}
              </p>
            </div>
          </div>

          <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
            <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Every claim in this report traces to one of the inputs above. If a section feels
              off, check its source — and ask the team to add what's missing before the next
              PPT.
            </span>
          </p>
        </div>
      </Section>
    </>
  );
}
