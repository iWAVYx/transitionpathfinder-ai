/**
 * Extended 30 / 60 / 90 day action plans for demo students.
 *
 * Each step is intentionally rich: a clear focus, a real owner, an estimated
 * time, 3-4 concrete sub-steps, and a "what success looks like" outcome so a
 * family or case manager can actually run it.
 */

export type ReadinessMetric = {
  category: string;
  level: "emerging" | "developing" | "progressing" | "ready";
  metric: string;
};

export type RichPlanStep = {
  week: number;
  focus: string;
  action: string;
  owner: string;
  time: string;
  details: string[];
  outcome: string;
  familyActions?: string[];
  teacherActions?: string[];
  readiness?: ReadinessMetric;
};

export type ExtendedPlans = {
  thirty: RichPlanStep[];
  sixty: RichPlanStep[];
  ninety: RichPlanStep[];
};

/* ============================================================
 * MAYA — animal care / hands-on pathway
 * ============================================================ */

const MAYA_THIRTY: RichPlanStep[] = [
  {
    week: 1,
    focus: "Align as a family",
    action: "Read the Pathway Report together and choose the 2 goals that matter most.",
    owner: "Family + Maya",
    time: "≈ 45 min",
    details: [
      "Sit down with Maya at a low-pressure time and read the Strengths and Student Voice sections out loud.",
      "Ask Maya: 'Which two of these feel most like you?' — let her circle them on a printed copy.",
      "Write the two chosen goals on a sticky note and put it on the fridge.",
      "Note any words Maya disagrees with so the case manager can adjust the IEP draft.",
    ],
    outcome: "The family agrees on a shared top-2 list before talking to the school.",
  },
  {
    week: 2,
    focus: "Open the school conversation",
    action: "Email Ms. Alvarez to request a PPT meeting AND a BRS Pre-ETS referral.",
    owner: "Family",
    time: "≈ 20 min",
    details: [
      "Use the email template in the Meeting Prep section — copy, paste, personalize.",
      "Attach the Pathway Report PDF so Ms. Alvarez sees the same picture you do.",
      "Ask for two date options within 3 weeks so it doesn't slip.",
      "Cc anyone who needs to be in the room (related-services, transition coordinator).",
    ],
    outcome: "A PPT meeting is on the calendar and a BRS referral is in motion.",
  },
  {
    week: 3,
    focus: "Real-world exposure",
    action: "Tour one local animal shelter or vet office together.",
    owner: "Family + Maya",
    time: "≈ 90 min",
    details: [
      "Call ahead — ask for a 20-minute tour, not a job interview.",
      "Bring 3 questions Maya wrote herself (sample questions are in the Student Voice section).",
      "Take one photo Maya is willing to share — it anchors the memory.",
      "On the drive home, ask: 'Which 10 minutes did you like most?' That's the signal.",
    ],
    outcome: "Maya has stood inside a real workplace in her interest area and named what she liked.",
  },
  {
    week: 4,
    focus: "Show up prepared",
    action: "Bring the Pathway Report and Maya's questions to the PPT meeting.",
    owner: "Family + Maya + Ms. Alvarez",
    time: "≈ 60 min meeting",
    details: [
      "Print 3 copies of the report — one for you, one for the case manager, one for Maya.",
      "Have Maya read the first sentence of her introduction if she's willing.",
      "Use the 'Questions for the PPT' list — ask them in order, write the answers down.",
      "Leave with one written commitment from the school (date + owner + action).",
    ],
    outcome: "Maya leaves the PPT with a written next step and a sense that she was heard.",
  },
];

const MAYA_SIXTY: RichPlanStep[] = [
  ...MAYA_THIRTY,
  {
    week: 5,
    focus: "Skill-build in real settings",
    action: "Start one weekly hands-on routine that mirrors the work Maya wants to do.",
    owner: "Family + Maya",
    time: "≈ 60 min / week",
    details: [
      "Pick one: walking a neighbor's dog, helping at a pet store on Saturdays, fostering a kitten.",
      "Same day, same time each week — predictability is the support.",
      "Keep a 3-line photo journal: what we did, what was easy, what was hard.",
      "After 2 weeks, Maya shares one photo with her case manager.",
    ],
    outcome: "Maya has a weekly anchor activity she can talk about in interviews and IEP meetings.",
  },
  {
    week: 6,
    focus: "Self-advocacy in practice",
    action: "Maya practices asking for one accommodation she actually needs.",
    owner: "Maya (with family coaching)",
    time: "≈ 30 min",
    details: [
      "Pick a low-stakes setting first (ordering at a café, asking a librarian for help).",
      "Use the 'I-statement' script: 'I learn best when ___. Could you ___?'",
      "Family role-plays it once at home before the real ask.",
      "Celebrate the attempt, not the outcome.",
    ],
    outcome: "Maya has spoken up for what she needs once in the real world, on her own.",
  },
  {
    week: 7,
    focus: "DDS eligibility groundwork",
    action: "Begin the DDS / state agency eligibility conversation.",
    owner: "Family",
    time: "≈ 60 min",
    details: [
      "Call the regional DDS office — ask which forms to start before Maya turns 18.",
      "Gather the documents listed in the Resources section (psychoeducational eval, school records).",
      "Put every deadline directly into the shared Calendar with reminders.",
      "Forward confirmation emails to the case manager for the file.",
    ],
    outcome: "The DDS clock is running and the family knows exactly what's due next.",
  },
  {
    week: 8,
    focus: "Tighten the IEP goal",
    action: "Send the case manager 2 concrete edits to Maya's self-advocacy goal.",
    owner: "Family + Maya",
    time: "≈ 30 min",
    details: [
      "Re-read the current goal aloud — does Maya understand it? If not, it's too vague.",
      "Add a measurable number (how many times per week, in what setting).",
      "Specify how progress will be tracked (data sheet, weekly check-in, photo evidence).",
      "Send the suggested wording in writing so it lands in the IEP draft.",
    ],
    outcome: "The next IEP draft has a self-advocacy goal Maya can actually see herself meeting.",
  },
];

const MAYA_NINETY: RichPlanStep[] = [
  ...MAYA_SIXTY,
  {
    week: 9,
    focus: "Try a second setting",
    action: "Visit one more work or training environment in Maya's interest area.",
    owner: "Family + Maya",
    time: "≈ 90 min",
    details: [
      "Pick something different from week 3 (e.g., a grooming salon if you toured a shelter).",
      "Ask the same 3 questions as last time so Maya can compare.",
      "Notice sensory load — light, sound, smell — and write down what worked.",
      "Add a third setting to a 'maybe later' list.",
    ],
    outcome: "Maya can now compare two real settings and explain which she prefers and why.",
  },
  {
    week: 10,
    focus: "Travel-training step 1",
    action: "Take one short public-transit trip together along a real route Maya might use.",
    owner: "Family + Maya",
    time: "≈ 60 min",
    details: [
      "Pre-load the route on Maya's phone (Google Maps or CT Transit app).",
      "Do the full trip together — ride, transfer, return. Narrate the cues out loud.",
      "Take a photo of each landmark stop for a visual route guide.",
      "Debrief: what felt safe, what was confusing, what we'd do differently.",
    ],
    outcome: "Maya has ridden one real bus route with support and has a visual guide for next time.",
  },
  {
    week: 11,
    focus: "Bring it back to school",
    action: "Share progress photos and route guide with the IEP team.",
    owner: "Family",
    time: "≈ 20 min",
    details: [
      "Email a 4-bullet update: tours, weekly routine, transit trip, self-advocacy moment.",
      "Ask for it to be filed as 'parent input' for the next IEP review.",
      "Request that the travel-training goal be formally added if it isn't already.",
      "Confirm BRS Pre-ETS enrollment status in the same email.",
    ],
    outcome: "Real-world progress is now part of Maya's official school record.",
  },
  {
    week: 12,
    focus: "Plan the next 90 days",
    action: "Sit down as a family and choose the next 3 priorities.",
    owner: "Family + Maya + (optional) case manager",
    time: "≈ 45 min",
    details: [
      "Re-read the Pathway Report — what's already done, what's still open?",
      "Pick exactly 3 priorities for the next quarter (a job shadow, DDS submission, summer plan).",
      "Put each priority on the Calendar with an owner and a first step.",
      "Schedule a 15-minute family check-in for week 14 to keep momentum.",
    ],
    outcome: "Maya's family ends the quarter with a clear, written plan for the next one.",
  },
];

/* ============================================================
 * JORDAN — creative media / entrepreneurship pathway
 * ============================================================ */

const JORDAN_THIRTY: RichPlanStep[] = [
  {
    week: 1,
    focus: "Build the planner Jordan will actually open",
    action: "Set up Jordan's phone calendar with every class deadline and read the report together.",
    owner: "Family + Jordan",
    time: "≈ 45 min",
    details: [
      "Open Jordan's phone calendar — same one he uses for his social plans.",
      "Pull deadlines from the school portal and add them with 24-hour reminders.",
      "Read the Strengths and Student Voice sections out loud together.",
      "Pin the calendar widget to his home screen so it's the first thing he sees.",
    ],
    outcome: "Jordan has one planner — the one already on his phone — with every deadline in it.",
  },
  {
    week: 2,
    focus: "Open the school conversation",
    action: "Email Mr. Okafor to request a PPT meeting and a BRS Pre-ETS referral.",
    owner: "Family",
    time: "≈ 20 min",
    details: [
      "Use the email template in the Meeting Prep section.",
      "Attach the Pathway Report PDF.",
      "Ask Mr. Okafor to add the school counselor about Gateway dual enrollment.",
      "Propose two date options inside 3 weeks.",
    ],
    outcome: "A PPT meeting is scheduled and the BRS referral is moving.",
  },
  {
    week: 3,
    focus: "See the real creative workplace",
    action: "Tour Gateway's Music & Sound Recording program and meet disability services.",
    owner: "Family + Jordan",
    time: "≈ 2 hours",
    details: [
      "Book the campus tour through Gateway admissions a week in advance.",
      "Ask specifically for the recording studio walkthrough.",
      "Stop by disability services — ask 'how do current students get accommodations here?'",
      "Bring Jordan's headphones — sit in the booth for 5 minutes.",
    ],
    outcome: "Jordan has stood inside a real studio and met one person at disability services by name.",
  },
  {
    week: 4,
    focus: "Show up prepared",
    action: "Bring the Pathway Report, Jordan's questions, and a link to his best beat to the PPT.",
    owner: "Family + Jordan + Mr. Okafor",
    time: "≈ 60 min meeting",
    details: [
      "Print 3 copies of the report.",
      "Have Jordan share one piece of his work — even just 30 seconds of audio on a phone.",
      "Ask for the work-completion goal to be tightened with a weekly tracker.",
      "Leave with a written commitment about senior-year dual enrollment.",
    ],
    outcome: "The IEP team sees Jordan's actual creative work and commits to one concrete next step.",
  },
];

const JORDAN_SIXTY: RichPlanStep[] = [
  ...JORDAN_THIRTY,
  {
    week: 5,
    focus: "Make the creative work visible",
    action: "Help Jordan launch a simple online portfolio (one page is enough).",
    owner: "Jordan (family supports)",
    time: "≈ 90 min",
    details: [
      "Pick the lowest-friction tool he'll keep using (Linktree, Carrd, a single Instagram highlight).",
      "Add 3 pieces: best beat, one video edit, one logo sketch.",
      "Add a one-sentence bio in Jordan's voice.",
      "Share the link in the family group chat — first audience builds momentum.",
    ],
    outcome: "Jordan has one URL he can send to a teacher, a college, or a future client.",
  },
  {
    week: 6,
    focus: "Driving practice on a schedule",
    action: "Start a weekly 30-minute driving practice block.",
    owner: "Family",
    time: "≈ 30 min / week",
    details: [
      "Same day, same time — block it on the calendar like an appointment.",
      "Start in empty parking lots, then quiet streets, then a real errand.",
      "Track hours in a notes file — DMV will ask later.",
      "If a week is missed, swap it — don't skip.",
    ],
    outcome: "Jordan has logged real, recurring driving hours toward his license.",
  },
  {
    week: 7,
    focus: "Money basics, in Jordan's world",
    action: "Set up a simple money tracker tied to his side hustle.",
    owner: "Jordan (family supports)",
    time: "≈ 45 min",
    details: [
      "Open a free spreadsheet or use a notes app with 3 columns: in / out / saved.",
      "Log the last 2 weeks of T-shirt or beat-sale activity to seed the habit.",
      "Pick a savings target (new mic, plug-in, sneakers) — make it visible.",
      "Review every Sunday for 5 minutes.",
    ],
    outcome: "Jordan can see his own money flow and has a concrete savings goal.",
  },
  {
    week: 8,
    focus: "One adult who 'gets' the creative side",
    action: "Identify and reach out to one working creative who could mentor Jordan informally.",
    owner: "Family + Jordan",
    time: "≈ 45 min",
    details: [
      "Brainstorm 3 names — a cousin's friend, a local producer, a teacher's contact.",
      "Draft a 4-sentence DM together: who Jordan is, what he's working on, the ask.",
      "Make the ask small: 15-minute call or studio visit, not a job.",
      "Follow up once after a week if no response.",
    ],
    outcome: "Jordan has reached out to a real working creative in his own voice.",
  },
];

const JORDAN_NINETY: RichPlanStep[] = [
  ...JORDAN_SIXTY,
  {
    week: 9,
    focus: "Try one paid gig",
    action: "Help Jordan land one small paid creative job.",
    owner: "Jordan (family supports)",
    time: "≈ 2 hours",
    details: [
      "Post the portfolio link with a clear offer: 'beats $25, logos $40, edits $30'.",
      "Tell 5 people in person — most first gigs come from family network.",
      "Use a simple invoice template — Jordan sends it, family reviews before send.",
      "Deliver on time, then ask the client for a 1-sentence testimonial.",
    ],
    outcome: "Jordan has earned his first invoiced dollar as a creative — and has a testimonial to prove it.",
  },
  {
    week: 10,
    focus: "Transit backup plan",
    action: "Take one real bus or train trip together — Jordan navigating.",
    owner: "Family + Jordan",
    time: "≈ 60 min",
    details: [
      "Pick a trip he might actually take (to Gateway, to a friend, to a studio).",
      "Jordan plans it — route, fare, transfer — family rides along silently.",
      "Screenshot the route as a backup in his phone.",
      "Debrief: where would you have gotten stuck without me?",
    ],
    outcome: "If driving falls through on any given day, Jordan has a transit option he's actually used.",
  },
  {
    week: 11,
    focus: "Senior-year course pick",
    action: "Lock in the Gateway dual-enrollment course for senior year.",
    owner: "Family + Jordan + counselor",
    time: "≈ 45 min",
    details: [
      "Confirm prerequisite is met or request a waiver in writing.",
      "Coordinate with the high school counselor on schedule fit.",
      "Register before the published deadline — put it on the calendar with a 7-day warning.",
      "Tour the building one more time so the first day isn't the first visit.",
    ],
    outcome: "Jordan is registered for a real college class his senior year.",
  },
  {
    week: 12,
    focus: "Plan the next 90 days",
    action: "Family sit-down to pick the next quarter's 3 priorities.",
    owner: "Family + Jordan + (optional) Mr. Okafor",
    time: "≈ 45 min",
    details: [
      "Re-read the Pathway Report — what's done, what's open?",
      "Pick 3 priorities (e.g., driver's license, second paid gig, summer creative program).",
      "Each priority gets an owner, a first step, and a calendar entry.",
      "Schedule a 15-minute family check-in for week 14.",
    ],
    outcome: "Jordan ends the quarter with momentum and a clear written plan for the next.",
  },
];

export const EXTENDED_PLANS: Record<"maya" | "jordan", ExtendedPlans> = {
  maya: { thirty: MAYA_THIRTY, sixty: MAYA_SIXTY, ninety: MAYA_NINETY },
  jordan: { thirty: JORDAN_THIRTY, sixty: JORDAN_SIXTY, ninety: JORDAN_NINETY },
};

export type PlanHorizon = "thirty" | "sixty" | "ninety";

export const HORIZON_META: Record<PlanHorizon, { label: string; days: number; tagline: string }> = {
  thirty: {
    label: "30-Day Plan",
    days: 30,
    tagline: "One real step a week — the fastest path to momentum.",
  },
  sixty: {
    label: "60-Day Plan",
    days: 60,
    tagline: "Build on the first month with skill-building, self-advocacy, and the agency clock.",
  },
  ninety: {
    label: "90-Day Plan",
    days: 90,
    tagline: "A full quarter: real-world exposure, travel training, and the next-quarter handoff.",
  },
};

/* ============================================================
 * Synthesizer — turn any PathwayReport into a rich 30/60/90 plan.
 * Used in signed-in mode where we don't have hand-authored extended
 * plans. Pulls from thirty_day_plan, family_action_plan, teacher_action_plan
 * and readiness_scorecard so each horizon actually reflects the report.
 * ============================================================ */

type ReportLike = {
  thirty_day_plan?: Array<{ week: number; action: string }>;
  family_action_plan?: {
    this_week?: string[];
    this_month?: string[];
    before_next_meeting?: string[];
    this_school_year?: string[];
    before_graduation?: string[];
  } | null;
  teacher_action_plan?: {
    goal_updates?: string[];
    progress_monitoring?: string[];
    family_communication?: string[];
  } | null;
  readiness_scorecard?: Array<{
    category: string;
    level?: string;
    growth_activity?: string;
    suggested_goal?: string;
    what_it_means?: string;
  }> | null;
  family_questions_for_ppt?: string[];
};

const OWNERS = {
  family: "Family + student",
  familySolo: "Family",
  team: "Family + case manager",
  student: "Student (with family coaching)",
} as const;

function pickFrom<T>(arr: T[] | undefined | null, i: number, fallback: T): T {
  if (!arr || arr.length === 0) return fallback;
  return arr[i % arr.length];
}

function buildStep(
  week: number,
  focus: string,
  action: string,
  owner: string,
  time: string,
  details: string[],
  outcome: string,
): RichPlanStep {
  const filled = details.filter(Boolean);
  while (filled.length < 3) {
    filled.push("Note what worked and what to adjust before next week's step.");
  }
  return { week, focus, action, owner, time, details: filled.slice(0, 4), outcome };
}

export function buildExtendedPlansFromReport(report: ReportLike): ExtendedPlans {
  const baseWeeks = (report.thirty_day_plan ?? []).slice(0, 4);
  const family = report.family_action_plan ?? {};
  const teacher = report.teacher_action_plan ?? {};
  const scorecard = (report.readiness_scorecard ?? []).slice(0, 6);
  const pptQuestions = report.family_questions_for_ppt ?? [];

  /* ---- 30 days: one rich step per thirty_day_plan week ---- */
  const focusByWeek = [
    "Align as a family",
    "Open the school conversation",
    "Take a first real-world step",
    "Show up prepared",
  ];
  const ownerByWeek = [OWNERS.family, OWNERS.familySolo, OWNERS.family, OWNERS.team];
  const timeByWeek = ["≈ 45 min", "≈ 20 min", "≈ 60–90 min", "≈ 60 min"];

  const thirty: RichPlanStep[] = baseWeeks.map((w, i) =>
    buildStep(
      w.week,
      focusByWeek[i] ?? `Week ${w.week} focus`,
      w.action,
      ownerByWeek[i] ?? OWNERS.family,
      timeByWeek[i] ?? "≈ 45 min",
      [
        pickFrom(family.this_week, i, "Sit down together at a calm time so the conversation isn't rushed."),
        pickFrom(pptQuestions, i, "Write down one question to bring to the next IEP team meeting."),
        scorecard[i]?.growth_activity ?? "Connect this step to one strength named in the report.",
        "Capture a short note or photo so progress shows up in the next IEP review.",
      ],
      i === 3
        ? "The student walks into the next meeting with their family aligned and a written ask."
        : `By the end of week ${w.week}, the family has finished this step and knows what comes next.`,
    ),
  );

  // Pad if thirty_day_plan was short.
  while (thirty.length < 4) {
    const idx = thirty.length;
    thirty.push(
      buildStep(
        idx + 1,
        "First-month follow-through",
        pickFrom(family.this_week, idx, "Pick one small action from the report and complete it this week."),
        OWNERS.family,
        "≈ 30 min",
        [
          "Choose a low-pressure time to do this together.",
          pickFrom(family.this_month, idx, "Tie this step to one goal from the report."),
          "Write down what worked so the next step is easier.",
        ],
        "Momentum keeps building into month two.",
      ),
    );
  }

  /* ---- 60 days: 30-day plan + 4 month-two weeks ---- */
  const monthTwoSources = [
    ...(family.this_month ?? []),
    ...(family.before_next_meeting ?? []),
  ];

  const sixty: RichPlanStep[] = [
    ...thirty,
    buildStep(
      5,
      "Skill-build in a real setting",
      pickFrom(monthTwoSources, 0, "Start one weekly hands-on routine tied to the student's top interest."),
      OWNERS.family,
      "≈ 60 min / week",
      [
        scorecard[0]?.growth_activity ?? "Pick an activity that mirrors the work the student wants to do.",
        "Same day, same time each week — predictability is the support.",
        "Keep a 3-line photo or note journal of what was easy and what was hard.",
        pickFrom(teacher.family_communication, 0, "Share one update with the case manager so the school sees the work."),
      ],
      "The student has a weekly anchor activity they can talk about in interviews and IEP meetings.",
    ),
    buildStep(
      6,
      "Self-advocacy in practice",
      scorecard.find((s) => /self.?advocacy|communication/i.test(s.category))?.growth_activity ??
        pickFrom(monthTwoSources, 1, "Practice asking for one accommodation the student actually needs."),
      OWNERS.student,
      "≈ 30 min",
      [
        "Pick a low-stakes setting first — ordering at a café, asking a librarian for help.",
        "Use an I-statement: 'I learn best when ___. Could you ___?'",
        "Role-play it once at home before the real ask.",
        "Celebrate the attempt, not the outcome.",
      ],
      "The student has spoken up for what they need once in the real world, on their own.",
    ),
    buildStep(
      7,
      "Agency & eligibility groundwork",
      pickFrom(monthTwoSources, 2, "Begin the state agency / DDS / BRS eligibility paperwork."),
      OWNERS.familySolo,
      "≈ 60 min",
      [
        "Call the regional office and ask which forms must be started before age 18.",
        "Gather the documents listed in the Resources section (eval, school records).",
        "Put every deadline directly into the shared Calendar with reminders.",
        "Forward confirmation emails to the case manager for the file.",
      ],
      "The agency clock is running and the family knows exactly what's due next.",
    ),
    buildStep(
      8,
      "Tighten the IEP goal",
      pickFrom(teacher.goal_updates, 0, "Send the case manager 2 concrete edits to a current IEP goal."),
      OWNERS.team,
      "≈ 30 min",
      [
        "Re-read the current goal aloud — does the student understand it? If not, it's too vague.",
        "Add a measurable number (how many times per week, in what setting).",
        pickFrom(teacher.progress_monitoring, 0, "Specify how progress will be tracked (data sheet, weekly check-in, photo evidence)."),
        "Send the suggested wording in writing so it lands in the IEP draft.",
      ],
      "The next IEP draft has a goal the student can actually see themselves meeting.",
    ),
  ];

  /* ---- 90 days: 60-day plan + 4 month-three weeks ---- */
  const longHorizonSources = [
    ...(family.this_school_year ?? []),
    ...(family.before_graduation ?? []),
  ];

  const ninety: RichPlanStep[] = [
    ...sixty,
    buildStep(
      9,
      "Try a second real setting",
      scorecard[1]?.growth_activity ??
        pickFrom(longHorizonSources, 0, "Visit one more work or training environment in the student's interest area."),
      OWNERS.family,
      "≈ 90 min",
      [
        "Pick something different from the week-3 setting so the student can compare.",
        "Ask the same questions as last time — comparison is the learning.",
        "Notice sensory load (light, sound, smell) and write down what worked.",
        "Add a third setting to a 'maybe later' list.",
      ],
      "The student can compare two real settings and explain which they prefer and why.",
    ),
    buildStep(
      10,
      "Independence step",
      scorecard.find((s) => /transport|independent|daily|community/i.test(s.category))?.growth_activity ??
        pickFrom(longHorizonSources, 1, "Take one short public-transit trip together along a real route the student might use."),
      OWNERS.family,
      "≈ 60 min",
      [
        "Pre-load the route on the student's phone.",
        "Do the full trip together — go, transfer, return. Narrate the cues out loud.",
        "Take a photo of each landmark stop for a visual route guide.",
        "Debrief: what felt safe, what was confusing, what we'd do differently.",
      ],
      "The student has completed one real independence task with support and has a guide for next time.",
    ),
    buildStep(
      11,
      "Bring it back to school",
      pickFrom(teacher.family_communication, 1, "Share progress photos and notes with the IEP team."),
      OWNERS.familySolo,
      "≈ 20 min",
      [
        "Email a 4-bullet update: settings tried, weekly routine, independence step, self-advocacy moment.",
        "Ask for it to be filed as 'parent input' for the next IEP review.",
        pickFrom(teacher.goal_updates, 1, "Request that any new transition goal be formally added if it isn't already."),
        "Confirm agency / Pre-ETS enrollment status in the same email.",
      ],
      "Real-world progress is now part of the student's official school record.",
    ),
    buildStep(
      12,
      "Plan the next 90 days",
      pickFrom(longHorizonSources, 2, "Sit down as a family and choose the next 3 priorities."),
      OWNERS.team,
      "≈ 45 min",
      [
        "Re-read the Pathway Report — what's already done, what's still open?",
        "Pick exactly 3 priorities for the next quarter (a job shadow, agency submission, summer plan).",
        "Put each priority on the Calendar with an owner and a first step.",
        "Schedule a 15-minute family check-in two weeks out to keep momentum.",
      ],
      "The family ends the quarter with a clear, written plan for the next one.",
    ),
  ];

  return { thirty, sixty, ninety };
}
