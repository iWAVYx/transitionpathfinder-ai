/**
 * Pathway Studio — single source of truth for the guided wizard stages.
 *
 * Each stage is one chapter of the from-scratch Atlas Ink experience.
 * Order = the user's literal walk through the studio. The rail, the
 * footer wizard (prev/next), the overview map, and the cover Table of
 * Contents all read from this list.
 */
export type StudioStageId =
  | "cover"
  | "intake"
  | "voice"
  | "documents"
  | "report"
  | "opportunities"
  | "resources"
  | "meeting"
  | "calendar"
  | "plan"
  | "hub"
  | "next";

export interface StudioStage {
  id: StudioStageId;
  /** Short label for the rail / overview map. */
  label: string;
  /** Slate kicker shown above the stage title on the canvas. */
  slate: string;
  /** One-sentence sub-line for the rail (what this stage produces). */
  produces: string;
  /** Folio label (italic, top-right of canvas). */
  folio: string;
  /** Route the stage links to. */
  to: string;
  /** Roman-numeral grouping for the overview map. */
  act: "I" | "II" | "III" | "IV";
}

/**
 * Stages in canonical order. The 11 chapter stages (intake → next) must
 * stay together as one block because the demo layout test renders an
 * 11-step row from this list (`.tf-journey` with 11 `.tf-journey-step`
 * children).
 */
export const STUDIO_STAGES: readonly StudioStage[] = [
  { id: "cover",         label: "Cover",            slate: "Pathway Studio · Cover",     produces: "Where every voice meets a plan.", folio: "00",  to: "/demo",                                act: "I"   },
  { id: "intake",        label: "Starting Point",   slate: "Listen · Starting Point",    produces: "Family-completed intake — the seed.", folio: "01",  to: "/demo/workspace/start",       act: "I"   },
  { id: "voice",         label: "Student Voice",    slate: "Listen · Student Voice",     produces: "What the student says, in their words.", folio: "02",  to: "/demo/workspace/voice",       act: "I"   },
  { id: "documents",     label: "Evidence",         slate: "Listen · Documents",         produces: "IEP, evaluations, and prior plans — read.", folio: "03",  to: "/demo/workspace/evidence",  act: "I"   },
  { id: "report",        label: "Pathway Report",   slate: "Synthesize · Pathway Report", produces: "Inputs become recommended pathways.", folio: "04",  to: "/demo/workspace/roadmap",    act: "II"  },
  { id: "opportunities", label: "Opportunities",    slate: "Synthesize · Opportunities", produces: "Real-world matches inside the report.", folio: "05",  to: "/demo/workspace/connect",    act: "II"  },
  { id: "resources",     label: "Resources",        slate: "Synthesize · Resources",     produces: "Curated supports for the student & family.", folio: "06",  to: "/demo/workspace/connect",   act: "II"  },
  { id: "meeting",       label: "Meeting Prep",     slate: "Plan · Meeting Prep",        produces: "An agenda the team agrees to in advance.", folio: "07",  to: "/demo/workspace/family",      act: "III" },
  { id: "calendar",      label: "Calendar",         slate: "Plan · Calendar",            produces: "Shared deadlines and follow-ups.", folio: "08",  to: "/demo/workspace/connect",             act: "III" },
  { id: "plan",          label: "30 / 60 / 90",     slate: "Plan · 30 / 60 / 90",        produces: "The next ninety days, in writing.", folio: "09",  to: "/demo/workspace/school",           act: "III" },
  { id: "hub",           label: "Student Hub",      slate: "Stay Together · Hub",        produces: "A living workspace between meetings.", folio: "10",  to: "/demo/workspace/connect",       act: "IV"  },
  { id: "next",          label: "What's Next",      slate: "Stay Together · What's Next", produces: "Clear next steps by role.", folio: "11",  to: "/demo/workspace/action",             act: "IV"  },
] as const;

export const CHAPTER_STAGES = STUDIO_STAGES.filter((s) => s.id !== "cover");

export const ACT_META: Record<StudioStage["act"], { title: string; dek: string }> = {
  I:   { title: "Act I · Listen",        dek: "Three voices, three lenses. Every recommendation begins with what the student, family, and documents say." },
  II:  { title: "Act II · Synthesize",   dek: "The Pathway Report turns intake, voice, and evidence into pathways, supports, and matched opportunities." },
  III: { title: "Act III · Plan",        dek: "Meeting prep, a shared calendar, and a 30 / 60 / 90 plan move the conversation from a binder into the week ahead." },
  IV:  { title: "Act IV · Stay Together", dek: "A Student Hub and clear next steps keep families, educators, and partners in sync between meetings." },
};

export function stageById(id: StudioStageId): StudioStage {
  const s = STUDIO_STAGES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown studio stage: ${id}`);
  return s;
}

export function neighbors(id: StudioStageId): { prev?: StudioStage; next?: StudioStage } {
  const idx = STUDIO_STAGES.findIndex((s) => s.id === id);
  return {
    prev: idx > 0 ? STUDIO_STAGES[idx - 1] : undefined,
    next: idx >= 0 && idx < STUDIO_STAGES.length - 1 ? STUDIO_STAGES[idx + 1] : undefined,
  };
}

export function progressPct(id: StudioStageId): number {
  const idx = STUDIO_STAGES.findIndex((s) => s.id === id);
  if (idx < 0) return 0;
  return Math.round((idx / (STUDIO_STAGES.length - 1)) * 100);
}
