import {
  ClipboardList,
} from "lucide-react";

import {
  DEMO_VOICE,
  DEMO_DOCUMENT_SOURCES,
  DEMO_INTAKE_CATEGORIES,
} from "@/lib/demo-extras";
import type { DemoStudentId } from "@/lib/demo-data";
import {
  PublicationPage,
  PublicationPullQuote,
  PublicationChecklist,
  PublicationCallout,
  PublicationSource,
  PublicationSpread,
  PublicationSidebar,
} from "@/components/publication/PublicationPage";

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
  Record<DemoStudentId, { title: string; steps: string[] }>
> = {
  student: {
    jordan: {
      title: "Your Next Steps, Jordan",
      steps: [
        "Pick one credentialed audio/video program to visit before the next PPT.",
        "Practice opening the next meeting yourself — one sentence about what you've made.",
        "Set up your digital planner this week and check it every morning for 10 days.",
      ],
    },
    maya: {
      title: "Your Next Steps, Maya",
      steps: [
        "Visit the daycare site once before your first shadow day.",
        "Practice your one-sentence opener for the meeting with your family.",
        "Try the bus route to school with a trusted adult, then ride it solo once.",
      ],
    },
  },
  family: {
    jordan: {
      title: "Your Next Steps as Jordan's Family",
      steps: [
        "Help Jordan schedule one credential-program tour in the next 30 days.",
        "Sit beside Jordan when he sets up his digital planner — don't take it over.",
        "Bring the IEP + transition assessment to the next PPT and ask about portfolio time.",
      ],
    },
    maya: {
      title: "Your Next Steps as Maya's Family",
      steps: [
        "Call the daycare to arrange a visit before the first shadow day.",
        "Walk the bus route with Maya twice this month before she rides solo.",
        "Bring the Vocational Profile to the next PPT and ask about a transportation plan.",
      ],
    },
  },
  educator: {
    jordan: {
      title: "Your Next Steps as Jordan's Case Manager",
      steps: [
        "Draft a student-led PPT agenda — open with Jordan's portfolio share.",
        "Confirm executive-function accommodations (visual scaffolds, short deadlines) before the meeting.",
        "Coordinate a credential-program tour and add a follow-up calendar event.",
      ],
    },
    maya: {
      title: "Your Next Steps as Maya's Case Manager",
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
      <div id="sec-self-advocacy-readiness" className="report-section scroll-mt-24 page-break">
        <PublicationPage
          kicker="Section 01"
          chapter="Self-Advocacy Readiness"
          dek="How this student speaks up for what they need — and the scaffolds that help them do it."
          part="Part Four — Voice & Independence"
          folio="p. 01"
        >
          {/* Intake rows */}
          {(advocacyIntake || meetingIntake) && (
            <div className="mb-6">
              {advocacyIntake && (
                <div className="border-b border-[color:var(--pub-rule-soft)] py-4">
                  <p className="font-[Urbanist,sans-serif] text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--pub-accent)]">
                    Where It Stands Today
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                    {advocacyIntake.answer}
                  </p>
                </div>
              )}
              {meetingIntake && (
                <div className="border-b border-[color:var(--pub-rule-soft)] py-4">
                  <p className="font-[Urbanist,sans-serif] text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--pub-accent)]">
                    At Meetings
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                    {meetingIntake.answer}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Voice pull-quotes */}
          {advocacyVoice.length > 0 && (
            <div className="mt-2 space-y-4">
              {advocacyVoice.slice(0, 3).map((v, i) => (
                <PublicationPullQuote key={i} attribution={`Prompt: ${v.prompt} · Shapes: ${v.affects}`}>
                  {v.response}
                </PublicationPullQuote>
              ))}
            </div>
          )}
        </PublicationPage>
      </div>

      {/* ============ Independent Living Readiness ============ */}
      <div id="sec-independent-living-readiness" className="report-section scroll-mt-24 page-break">
        <PublicationPage
          kicker="Section 02"
          chapter="Independent Living Readiness"
          dek="What this student already does on their own, what they're working toward, and the supports that get them there."
          part="Part Four — Voice & Independence"
          folio="p. 02"
        >
          <PublicationSpread
            lead={
              <div>
                <div className="border-b border-[color:var(--pub-rule-soft)] py-4">
                  <p className="font-[Urbanist,sans-serif] text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--pub-accent)]">
                    Doing on Their Own
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                    {living.strengths || independent?.answer || "—"}
                  </p>
                </div>
                {living.needs && (
                  <div className="border-b border-[color:var(--pub-rule-soft)] py-4">
                    <p className="font-[Urbanist,sans-serif] text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--pub-accent)]">
                      Still Working On
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                      {living.needs}
                    </p>
                  </div>
                )}
                {transport && (
                  <div className="border-b border-[color:var(--pub-rule-soft)] py-4">
                    <p className="font-[Urbanist,sans-serif] text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--pub-accent)]">
                      Transportation
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                      {transport.answer}
                    </p>
                  </div>
                )}
              </div>
            }
            side={
              support ? (
                <PublicationSidebar label="What Supports Them Best">
                  {support.answer}
                </PublicationSidebar>
              ) : null
            }
          />
        </PublicationPage>
      </div>

      {/* ============ Role-Specific Next Steps ============ */}
      <div id="sec-role-next-steps" className="report-section scroll-mt-24 page-break">
        <PublicationPage
          kicker="Section 03"
          chapter={next.title}
          dek="Tailored to the view you're reading — switch views above to see the same plan from a different seat at the table."
          part="Part Four — Voice & Independence"
          folio="p. 03"
        >
          <PublicationChecklist items={next.steps} />
          <PublicationCallout kind="next">
            Review these steps with your team before the next PPT. Each one traces directly to what this student told us.
          </PublicationCallout>
        </PublicationPage>
      </div>

      {/* ============ Source Notes / Information Used ============ */}
      <div id="sec-source-notes" className="report-section scroll-mt-24 page-break">
        <PublicationPage
          kicker="Section 04"
          chapter="Sources & Information Used"
          dek="A transparent index of every input this report draws from. No source = no claim."
          part="Part Four — Voice & Independence"
          folio="p. 04"
        >
          {/* Documents reviewed */}
          {sources.length > 0 && (
            <section>
              <h2 className="font-[Urbanist,sans-serif] text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--pub-accent)] mb-2">
                Documents Reviewed
              </h2>
              <hr className="border-[color:var(--pub-rule-soft)] mb-2" />
              {sources.map((s, i) => (
                <div key={i} className="border-b border-[color:var(--pub-rule-soft)] py-3">
                  <p className="text-sm font-medium text-foreground/90">{s.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.docType} · {s.pages} pp · {s.uploadedBy}
                  </p>
                </div>
              ))}
            </section>
          )}

          {/* Intake inputs */}
          {intake.length > 0 && (
            <section className="mt-6">
              <h2 className="font-[Urbanist,sans-serif] text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--pub-accent)] mb-2">
                Intake Inputs
              </h2>
              <hr className="border-[color:var(--pub-rule-soft)] mb-2" />
              {intake.slice(0, 6).map((c, i) => (
                <div key={i} className="border-b border-[color:var(--pub-rule-soft)] py-3">
                  <p className="text-sm font-medium text-foreground/90">{c.category}</p>
                  <p className="text-xs text-muted-foreground">→ {c.flowsTo}</p>
                </div>
              ))}
            </section>
          )}

          {/* Meta footer */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="font-[Urbanist,sans-serif] text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Student Voice
              </p>
              <p className="mt-1 text-sm text-foreground/85">
                {(DEMO_VOICE[studentId] ?? []).length} reflection prompts answered
              </p>
            </div>
            <div>
              <p className="font-[Urbanist,sans-serif] text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Prepared By
              </p>
              <p className="mt-1 text-sm text-foreground/85">
                {preparedBy ?? "TransitionForward (AI-supported, human-reviewed)"}
              </p>
            </div>
            <div>
              <p className="font-[Urbanist,sans-serif] text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Document
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {reportId ?? "—"} · {issued ?? "—"}
              </p>
            </div>
          </div>

          <PublicationSource>
            <ClipboardList className="inline mr-1 h-3.5 w-3.5 shrink-0 align-text-bottom" />
            Every claim in this report traces to one of the inputs above. If a section feels
            off, check its source — and ask the team to add what's missing before the next PPT.
          </PublicationSource>
        </PublicationPage>
      </div>
    </>
  );
}
