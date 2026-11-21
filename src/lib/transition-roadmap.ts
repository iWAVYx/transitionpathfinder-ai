export const PATHWAY_ID = "transition-roadmap-v1";

type Milestone = { title: string; description: string };
type Phase = { id: string; label: string; milestones: Milestone[] };

export const PHASES: Phase[] = [
  {
    id: "discover",
    label: "Discover (9th–10th grade)",
    milestones: [
      { title: "Complete a strengths & interests inventory", description: "Use a tool like the O*NET Interest Profiler with the student." },
      { title: "Identify 2–3 possible career pathways", description: "Talk about what they love, then connect it to real roles." },
      { title: "Build a circle of support", description: "List trusted adults at home, at school, and in the community." },
    ],
  },
  {
    id: "explore",
    label: "Explore (10th–11th grade)",
    milestones: [
      { title: "Job shadow or informational interview", description: "Even an hour with someone in a related role builds confidence." },
      { title: "Try a community-based experience", description: "Volunteering, club, or part-time job aligned to their interests." },
      { title: "Practice self-advocacy in a PPT meeting", description: "Help the student lead one section of their own meeting." },
    ],
  },
  {
    id: "prepare",
    label: "Prepare (11th–12th grade)",
    milestones: [
      { title: "Connect with Bureau of Rehabilitation Services (BRS)", description: "Open a case ahead of graduation to unlock adult supports." },
      { title: "Tour post-secondary options", description: "Community college, CT technical school, supported employment, or a transition program." },
      { title: "Draft a one-page transition portfolio", description: "Strengths, supports that work, goals, and contact info on a single page." },
    ],
  },
  {
    id: "launch",
    label: "Launch (12th grade & beyond)",
    milestones: [
      { title: "Confirm transportation plan", description: "Bus pass, paratransit, ride share, or family driver — written down." },
      { title: "Set up adult healthcare & benefits", description: "Insurance transition, doctors, and any benefits like SSI if eligible." },
      { title: "First 90 days plan after graduation", description: "Daily schedule, who checks in, and what success looks like." },
    ],
  },
];

export const FLAT = PHASES.flatMap((p, pi) =>
  p.milestones.map((m, mi) => ({ phaseId: p.id, phaseLabel: p.label, ...m, step_index: pi * 100 + mi })),
);

