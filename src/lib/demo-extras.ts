/**
 * Extended demo fixtures for the public walkthrough.
 *
 * Everything here is FICTIONAL sample data used only on /demo/* routes.
 * Nothing is persisted, nothing leaves the browser, and none of these
 * fields map to real student records.
 */

import type { DemoStudentId } from "@/lib/demo-data";

export interface VoicePrompt {
  prompt: string;
  response: string;
  affects: string; // how this affects recommendations
}

export type DocumentType =
  | "IEP"
  | "Transition Assessment"
  | "Psychoeducational Evaluation"
  | "Vocational Profile"
  | "504 Plan";

export interface DocumentInsight {
  area: string;
  summary: string;
  source: string;
  docType: DocumentType;
  needsReview?: boolean;
}

export interface DocumentSource {
  docType: DocumentType;
  label: string;
  uploadedBy: string;
  pages: number;
}

export interface PartnerOpportunity {
  id: string;
  name: string;
  org: string;
  type: "Education" | "Employment" | "Apprenticeship" | "Internship" | "Community";
  location: string;
  eligibility: string;
  nextStep: string;
  why: string;
  saved?: boolean;
}

export interface ActionItem {
  task: string;
  owner: "Student" | "Family" | "Case Manager" | "School" | "Partner";
  due: string;
  source: "Student Voice" | "Family Priority" | "IEP" | "Educator Input" | "Pathway Match";
}

export interface IntakeCategoryAnswer {
  category: string;
  question: string;
  answer: string;
  flowsTo: string;
}

export const DEMO_VOICE: Record<DemoStudentId, VoicePrompt[]> = {
  jordan: [
    {
      prompt: "What are you good at?",
      response:
        "Editing video and making beats. People say my projects feel finished, not rushed.",
      affects: "Strengthens the Media / Audio production pathway and creative career matches.",
    },
    {
      prompt: "What do you want to do after high school?",
      response:
        "Take a short program for audio or video and start getting paid work. I don't want four more years of school right away.",
      affects: "Prioritizes credential and apprenticeship pathways over 4-year college matches.",
    },
    {
      prompt: "What kind of work sounds interesting?",
      response:
        "A real studio. Or making short videos for small businesses. Something I can show people.",
      affects: "Surfaces internship + freelance creative opportunities; flags portfolio resources.",
    },
    {
      prompt: "What helps you learn best?",
      response: "Watching someone do it once, then trying it. Lists I can check off. Short deadlines.",
      affects: "Recommends visual scaffolds + executive-function supports in the action plan.",
    },
    {
      prompt: "What do you want adults to understand about you?",
      response:
        "I'm not lazy. I lose track of dates and forms. Once I know the why, I show up.",
      affects: "Adds a Strengths + Communication note to the Meeting Prep packet.",
    },
    {
      prompt: "What do you want to say at your next meeting?",
      response:
        "I want to talk first. I want to share what I've made and what I want to try next.",
      affects: "Drafts student-led agenda items in Meeting Prep.",
    },
    {
      prompt: "What makes you feel ready — or not ready?",
      response:
        "Ready: when I've practiced the thing once. Not ready: when nobody told me the plan.",
      affects: "Triggers preview-first action items + clear next-step language across the plan.",
    },
  ],
  maya: [
    {
      prompt: "What are you good at?",
      response: "Helping kids and animals stay calm. People say I'm patient.",
      affects: "Strengthens Early Childhood / Animal Care pathways.",
    },
    {
      prompt: "What do you want to do after high school?",
      response: "Work somewhere I can help every day, and live close enough to take the bus.",
      affects: "Prioritizes supported employment + transportation training in the plan.",
    },
    {
      prompt: "What kind of work sounds interesting?",
      response: "A daycare or a vet office. Somewhere busy but kind.",
      affects: "Surfaces community-based work experiences and shadow-day matches.",
    },
    {
      prompt: "What helps you learn best?",
      response: "Pictures, doing it with someone, and praise when I get it right.",
      affects: "Recommends visual schedules + coached practice in the action plan.",
    },
    {
      prompt: "What do you want adults to understand about you?",
      response: "I work hard. I just need a minute to think before I answer.",
      affects: "Adds processing-time accommodations note to the Meeting Prep packet.",
    },
    {
      prompt: "What do you want to say at your next meeting?",
      response: "Thank everyone, then say what kind of job I want to try.",
      affects: "Drafts a short, student-led opener in Meeting Prep.",
    },
    {
      prompt: "What makes you feel ready — or not ready?",
      response: "Ready: when I've visited the place. Not ready: when it's brand new.",
      affects: "Adds a 'visit first' step to every new placement in the action plan.",
    },
  ],
};

export const DEMO_DOCUMENT_INSIGHTS: Record<DemoStudentId, DocumentInsight[]> = {
  jordan: [
    {
      area: "Transition Goal Areas",
      summary:
        "Postsecondary education (community college, credential program) · Employment (creative industry) · Independent living (transportation, money management).",
      source: "IEP (sample) · 09/12/2025",
    },
    {
      area: "Accommodations Detected",
      summary:
        "Extended time on tests · Use of digital planner · Preferential seating · Pre-printed notes for executive-function support.",
      source: "IEP (sample) · 09/12/2025",
    },
    {
      area: "Related Services",
      summary:
        "Direct instruction in self-advocacy (weekly) · Consultative transition planning (monthly) · Counseling check-ins as needed.",
      source: "IEP (sample) · 09/12/2025",
    },
    {
      area: "Strengths Cited In Document",
      summary:
        "Creative problem solving, strong adult communication, follow-through on projects he cares about.",
      source: "IEP (sample) · 09/12/2025",
    },
    {
      area: "Needs Review",
      summary:
        "Transition goal #2 mentions 'job shadowing' but no provider or timeline is listed. Verify with case manager.",
      source: "IEP (sample) · 09/12/2025",
      needsReview: true,
    },
    {
      area: "Needs Review",
      summary:
        "Driver's-ed instruction referenced but not added to the services grid.",
      source: "IEP (sample) · 09/12/2025",
      needsReview: true,
    },
  ],
  maya: [
    {
      area: "Transition Goal Areas",
      summary:
        "Supported employment (early childhood / animal care) · Community participation · Independent living (transportation, daily routines).",
      source: "IEP (sample) · 08/28/2025",
    },
    {
      area: "Accommodations Detected",
      summary:
        "Visual schedules · Processing-time prompts · Repeated directions in writing · Sensory breaks as needed.",
      source: "IEP (sample) · 08/28/2025",
    },
    {
      area: "Related Services",
      summary:
        "Speech-language (weekly) · OT consult (monthly) · Job coaching at community placement (weekly).",
      source: "IEP (sample) · 08/28/2025",
    },
    {
      area: "Strengths Cited In Document",
      summary:
        "Patient with children and animals, dependable attendance, strong follow-through with a visual checklist.",
      source: "IEP (sample) · 08/28/2025",
    },
    {
      area: "Needs Review",
      summary:
        "Transportation-training goal lists 'bus practice' but no instructor or route is named.",
      source: "IEP (sample) · 08/28/2025",
      needsReview: true,
    },
  ],
};

export const DEMO_OPPORTUNITIES: Record<DemoStudentId, PartnerOpportunity[]> = {
  jordan: [
    {
      id: "gw-audio",
      name: "Audio Engineering Pathway (Dual Enrollment)",
      org: "Gateway Community College — sample partner",
      type: "Education",
      location: "New Haven, CT",
      eligibility: "Junior or senior with media interest. No prior credit required.",
      nextStep: "Schedule a campus tour and pathway advisor meeting.",
      why: "Matches Jordan's stated goal of 'a short program, then paid work' and his audio strength.",
      saved: true,
    },
    {
      id: "studio-int",
      name: "Studio Apprentice — 8-Week Summer Cohort",
      org: "Northeast Creators Collective — sample partner",
      type: "Apprenticeship",
      location: "Hartford, CT",
      eligibility: "Portfolio of any kind (audio, video, design). Stipend available.",
      nextStep: "Submit a 60-second sample reel and an interest form.",
      why: "Real-world creative reps + mentor — directly addresses Educator priority.",
    },
    {
      id: "media-intern",
      name: "Small-Business Media Internship",
      org: "Main Street Media Co-op — sample partner",
      type: "Internship",
      location: "Hybrid · CT",
      eligibility: "10 hrs/week. Open to students with IEPs and 504 plans.",
      nextStep: "Attend the upcoming Saturday info session.",
      why: "Short, paid, visible — fits Jordan's preference for tangible work to show.",
    },
    {
      id: "fin-lit",
      name: "Young Entrepreneur Financial Literacy",
      org: "BridgeForward Partner Network — sample",
      type: "Community",
      location: "Online + 2 in-person sessions",
      eligibility: "Grades 10–12. Free.",
      nextStep: "Add Jordan to the spring cohort waitlist.",
      why: "Family priority: build money + adulting confidence alongside creative work.",
    },
  ],
  maya: [
    {
      id: "ec-program",
      name: "Early Childhood Assistant Certificate (Community College)",
      org: "Housatonic CC — sample partner",
      type: "Education",
      location: "Bridgeport, CT",
      eligibility: "Open enrollment. Accommodations supported.",
      nextStep: "Request a campus visit and disability-services intake.",
      why: "Aligns with Maya's stated love of working with young children.",
      saved: true,
    },
    {
      id: "vet-shadow",
      name: "Veterinary Office Shadow-Day Program",
      org: "Connecticut Animal Welfare Partners — sample",
      type: "Internship",
      location: "Stratford, CT",
      eligibility: "1-day shadow placements, 2× monthly. Free.",
      nextStep: "Pick a Saturday and add to the calendar.",
      why: "Low-risk way to confirm interest before a longer placement.",
    },
    {
      id: "supp-emp",
      name: "Supported Employment — Daycare Track",
      org: "The Kennedy Collective — sample partner",
      type: "Employment",
      location: "Trumbull, CT",
      eligibility: "Receives BRS funding. Job coach on site.",
      nextStep: "Open a BRS referral and intake call.",
      why: "Matches Maya's goal of working close to home with a coach available.",
    },
    {
      id: "bus-prac",
      name: "Travel Training — Community Bus Cohort",
      org: "Regional Mobility Partners — sample",
      type: "Community",
      location: "CT regional transit",
      eligibility: "Free. Caregiver may attend first session.",
      nextStep: "Pick a starting route from Maya's neighborhood.",
      why: "Family priority: independent transportation to placements.",
    },
  ],
};

export const DEMO_ACTION_PLAN: Record<DemoStudentId, { thirty: ActionItem[]; sixty: ActionItem[]; ninety: ActionItem[] }> = {
  jordan: {
    thirty: [
      { task: "Tour Gateway's audio engineering program", owner: "Family", due: "Within 30 days", source: "Student Voice" },
      { task: "Set up shared digital planner; review weekly with case manager", owner: "Case Manager", due: "Within 14 days", source: "IEP" },
      { task: "Draft 60-second sample reel for studio apprentice application", owner: "Student", due: "Within 30 days", source: "Pathway Match" },
    ],
    sixty: [
      { task: "Complete one informational interview with a working creative", owner: "Student", due: "Within 60 days", source: "Educator Input" },
      { task: "Begin driver's ed; log 6 practice sessions", owner: "Family", due: "Within 60 days", source: "Family Priority" },
      { task: "Update transition goal #2 with provider + timeline", owner: "Case Manager", due: "Within 45 days", source: "IEP" },
    ],
    ninety: [
      { task: "Submit studio apprentice application", owner: "Student", due: "Within 90 days", source: "Pathway Match" },
      { task: "Open BRS conversation about post-school supports", owner: "Family", due: "Within 90 days", source: "Family Priority" },
      { task: "Lead first 5 minutes of upcoming PPT meeting", owner: "Student", due: "Next PPT", source: "Student Voice" },
    ],
  },
  maya: {
    thirty: [
      { task: "Schedule disability-services intake at Housatonic CC", owner: "Family", due: "Within 30 days", source: "Pathway Match" },
      { task: "Pick first travel-training route + add to shared calendar", owner: "Case Manager", due: "Within 14 days", source: "Family Priority" },
      { task: "Book a Saturday vet-office shadow day", owner: "Family", due: "Within 30 days", source: "Student Voice" },
    ],
    sixty: [
      { task: "Practice a 3-sentence student-led meeting opener", owner: "Student", due: "Within 60 days", source: "Student Voice" },
      { task: "Add visual schedule to morning routine; log 4 weeks", owner: "Family", due: "Within 60 days", source: "IEP" },
      { task: "Confirm BRS referral and meet potential job coach", owner: "Case Manager", due: "Within 60 days", source: "Educator Input" },
    ],
    ninety: [
      { task: "Complete first supported employment placement week", owner: "Partner", due: "Within 90 days", source: "Pathway Match" },
      { task: "Update IEP transportation goal with route + instructor", owner: "School", due: "Within 90 days", source: "IEP" },
      { task: "Open conversation about post-graduation supported-employment plan", owner: "Family", due: "Within 90 days", source: "Family Priority" },
    ],
  },
};

export const DEMO_INTAKE_CATEGORIES: Record<DemoStudentId, IntakeCategoryAnswer[]> = {
  jordan: [
    { category: "Strengths", question: "What does this student do well?", answer: "Audio + video production, adult communication, finishes projects he cares about.", flowsTo: "Strengths, Preferences, Interests, Needs" },
    { category: "Interests", question: "What lights them up?", answer: "Music production, short-form video, small-business storytelling.", flowsTo: "Recommended Pathways" },
    { category: "Postsecondary Goals", question: "After high school?", answer: "Short credential, paid creative work, eventual community college.", flowsTo: "Education / Training Options" },
    { category: "Work / Career Interests", question: "What kind of work?", answer: "Studio, content for small businesses, freelance.", flowsTo: "Career / Program Matches" },
    { category: "Education / Training", question: "Open to college?", answer: "Yes — start with credentialed program, not a 4-year right away.", flowsTo: "Education / Training Options" },
    { category: "Independent Living", question: "Daily-life skills?", answer: "Needs scaffolds for money management, schedules, deadlines.", flowsTo: "Independent Living Supports" },
    { category: "Transportation", question: "How do they get around?", answer: "Permit, no license yet. Goal: drive solo by graduation.", flowsTo: "Independent Living Supports" },
    { category: "Self-Advocacy", question: "Speaks up?", answer: "1:1 yes; in groups, lingers after to ask the real question.", flowsTo: "Self-Advocacy Supports" },
    { category: "Support Preferences", question: "What helps?", answer: "Visual scaffolds, short deadlines, see-it-once-then-try.", flowsTo: "Recommended Pathways" },
    { category: "Meeting Confidence", question: "How confident at meetings?", answer: "Wants to open the next PPT himself.", flowsTo: "Meeting Prep Questions" },
    { category: "Family Priorities", question: "What matters most to family?", answer: "Clear next steps + adulting confidence.", flowsTo: "Family Priorities" },
    { category: "Educator Notes", question: "What does the team observe?", answer: "Executive function is the real barrier — not ability.", flowsTo: "Educator Input" },
    { category: "Documents Available", question: "What do we have?", answer: "Current IEP, recent vocational interest inventory.", flowsTo: "IEP / Document Insights" },
    { category: "Urgent Next Step", question: "What is the next thing to do?", answer: "Tour a credential program and start a digital planner habit.", flowsTo: "30 / 60 / 90 Day Action Plan" },
  ],
  maya: [
    { category: "Strengths", question: "What does this student do well?", answer: "Patient with children and animals, dependable, follows visual checklists.", flowsTo: "Strengths, Preferences, Interests, Needs" },
    { category: "Interests", question: "What lights her up?", answer: "Daycare, vet clinics, gentle structured environments.", flowsTo: "Recommended Pathways" },
    { category: "Postsecondary Goals", question: "After high school?", answer: "Supported employment close to home + community classes.", flowsTo: "Education / Training Options" },
    { category: "Work / Career Interests", question: "What kind of work?", answer: "Daycare assistant or veterinary office helper.", flowsTo: "Career / Program Matches" },
    { category: "Education / Training", question: "Training interest?", answer: "Early Childhood Assistant Certificate with accommodations.", flowsTo: "Education / Training Options" },
    { category: "Independent Living", question: "Daily-life skills?", answer: "Strong with visual schedule; needs coaching on new routines.", flowsTo: "Independent Living Supports" },
    { category: "Transportation", question: "How does she get around?", answer: "Family drives now. Goal: independent bus to one site.", flowsTo: "Independent Living Supports" },
    { category: "Self-Advocacy", question: "Speaks up?", answer: "Quiet but consistent; needs processing time.", flowsTo: "Self-Advocacy Supports" },
    { category: "Support Preferences", question: "What helps?", answer: "Pictures, doing it with someone, praise when she gets it right.", flowsTo: "Recommended Pathways" },
    { category: "Meeting Confidence", question: "How confident at meetings?", answer: "Will open with a thank-you and one sentence about goals.", flowsTo: "Meeting Prep Questions" },
    { category: "Family Priorities", question: "What matters most to family?", answer: "Safe placement, kind environment, transportation plan.", flowsTo: "Family Priorities" },
    { category: "Educator Notes", question: "What does the team observe?", answer: "Visits-first protocol unlocks confidence quickly.", flowsTo: "Educator Input" },
    { category: "Documents Available", question: "What do we have?", answer: "Current IEP, OT consult notes, job-coach feedback.", flowsTo: "IEP / Document Insights" },
    { category: "Urgent Next Step", question: "What is the next thing to do?", answer: "Pick the first travel-training route and book one shadow day.", flowsTo: "30 / 60 / 90 Day Action Plan" },
  ],
};

export type DemoRoleView =
  | "student"
  | "parent"
  | "educator"
  | "school"
  | "district"
  | "partner"
  | "platform";

export const DEMO_ROLE_VIEWS: { id: DemoRoleView; label: string; tagline: string }[] = [
  { id: "student", label: "Student", tagline: "My next step, my voice, my opportunities." },
  { id: "parent", label: "Parent", tagline: "Family priorities, document review, what's next." },
  { id: "educator", label: "Educator", tagline: "Caseload coverage, report review, action items." },
  { id: "school", label: "School Admin", tagline: "Aggregate implementation — no private details." },
  { id: "district", label: "District Admin", tagline: "School-by-school adoption and support needs." },
  { id: "partner", label: "Partner", tagline: "Opportunities, statuses, incentives — no PII." },
  { id: "platform", label: "Platform Admin", tagline: "Queues, approvals, moderation, system health." },
];

// ---------------------------------------------------------------------------
// Per-step × per-role lens content
//
// Used by <DemoRoleLens /> on every demo step so the same role choice
// changes what each step emphasizes. Copy is intentionally short — the
// lens reframes, it doesn't replace the page body.
// ---------------------------------------------------------------------------

export type DemoLensStep =
  | "intake"
  | "report"
  | "resources"
  | "opportunities"
  | "plan"
  | "hub";

export interface DemoLensContent {
  /** One-sentence framing of what this role sees on this step. */
  headline: string;
  /** 3 short bullets — what this role is looking at / can do here. */
  bullets: string[];
  /** Short "why this matters for this role" line. */
  why: string;
  /** Optional privacy note when the role is intentionally restricted. */
  privacy?: string;
}

export const DEMO_STEP_LENSES: Record<
  DemoLensStep,
  Record<DemoRoleView, DemoLensContent>
> = {
  intake: {
    student: {
      headline: "These answers are in your voice — you can change anything before it gets shared.",
      bullets: [
        "Read what your team wrote about your strengths and interests.",
        "Add or correct anything that doesn't sound like you.",
        "Pick the answers you want to share at your next meeting.",
      ],
      why: "Your voice anchors the plan — everything downstream weighs it first.",
    },
    parent: {
      headline: "The full guided intake your family filled out, in one scrollable view.",
      bullets: [
        "Confirm strengths, supports, and family concerns are accurate.",
        "Flag anything you want the case manager to revisit.",
        "Add a note before the next meeting if priorities have shifted.",
      ],
      why: "Families stay informed without having to retype answers across forms.",
    },
    educator: {
      headline: "Intake highlights the inputs you'll use to draft the Pathway Report.",
      bullets: [
        "Cross-check student voice against IEP goals and observations.",
        "Note gaps (missing transportation, communication preference, etc.).",
        "Add your educator input — it shows up labeled in the report.",
      ],
      why: "Fewer duplicated questionnaires. The team starts from one source.",
    },
    school: {
      headline: "Aggregate view — intake completion rates and missing fields across caseloads.",
      bullets: [
        "See completion percentage by grade band and case manager.",
        "Identify fields most often left blank (transportation, self-advocacy).",
        "No private answers surfaced at this level.",
      ],
      why: "Spot implementation gaps without ever opening an individual student.",
      privacy: "Private intake content is hidden at the school level.",
    },
    district: {
      headline: "School-by-school intake adoption — same shape, district-wide.",
      bullets: [
        "Adoption rates per school and per grade band.",
        "Where families need more outreach to complete intake.",
        "Trends over time, no PII.",
      ],
      why: "Decide where to direct support resources, with evidence.",
      privacy: "District view is aggregate only — no student answers.",
    },
    partner: {
      headline: "Partners don't see intake.",
      bullets: [
        "Partners receive opportunity-level interest, not private answers.",
        "Profile data flowing from intake is shielded.",
        "If a student opts in to an opportunity, only the named contact is shared.",
      ],
      why: "Partners stay outside the consent boundary by default.",
      privacy: "Intake answers are never shared with partners.",
    },
    platform: {
      headline: "Intake throughput, validation errors, and onboarding funnel.",
      bullets: [
        "Submission counts, drop-off steps, validation failures.",
        "Spot fields where wording or examples need revision.",
        "Admin access is logged for every aggregate query.",
      ],
      why: "Keep the intake form working for everyone, everywhere.",
      privacy: "Operational metrics only — no student answers exposed.",
    },
  },
  report: {
    student: {
      headline: "Your Pathway Report, in plain language — built from your voice first.",
      bullets: [
        "Read your strengths, interests, and recommended next pathways.",
        "Expand any section to see what backs the recommendation.",
        "Save what you want to bring to your next meeting.",
      ],
      why: "Confidence comes from understanding why the plan looks the way it does.",
    },
    parent: {
      headline: "The shared Pathway Report — read it like a letter, not a form.",
      bullets: [
        "Family Priorities sit at the top, alongside student voice.",
        "Source labels show what came from the IEP vs. the family.",
        "Use 'Open Meeting Prep' to walk into the next PPT prepared.",
      ],
      why: "Families don't have to translate jargon to participate fully.",
    },
    educator: {
      headline: "Educator review queue — flag, edit, or approve before sharing.",
      bullets: [
        "Each section is editable with rationale fields.",
        "Compare AI draft vs. last version side-by-side.",
        "Approve once — family + student see the same version.",
      ],
      why: "Cuts report drafting time so you can focus on planning.",
    },
    school: {
      headline: "Implementation snapshot — reports completed, in review, overdue.",
      bullets: [
        "Counts by case manager, grade, and report status.",
        "Time-to-complete trends over the last quarter.",
        "Drill-down opens an educator view, not a private profile.",
      ],
      why: "Confirm reports are moving without reading their contents.",
      privacy: "Report content is hidden at the school admin level.",
    },
    district: {
      headline: "Report adoption + completion across schools.",
      bullets: [
        "School-by-school report completion rates.",
        "Equity view: which student groups have completed reports.",
        "Aggregate — no individual report contents.",
      ],
      why: "Make district-wide rollout decisions from real evidence.",
      privacy: "District view never exposes report contents.",
    },
    partner: {
      headline: "Partners don't see the Pathway Report.",
      bullets: [
        "Partners only see opportunity-level interest signals.",
        "No goals, no IEP language, no health information.",
        "If shared, only the fields the family explicitly opts in.",
      ],
      why: "Partners stay outside the report consent boundary by default.",
      privacy: "Reports are never shared with partners.",
    },
    platform: {
      headline: "Report generation health — model latency, error rates, version drift.",
      bullets: [
        "Draft-time and approval-time percentiles.",
        "Failed generations + retry queue.",
        "Version comparison sampling for quality.",
      ],
      why: "Keep the report engine reliable and reviewable.",
      privacy: "Operational metrics only — no report contents.",
    },
  },
  resources: {
    student: {
      headline: "Resources matched to you — what it is, why it helps, how to use it.",
      bullets: [
        "Save the ones you want to come back to.",
        "Each card explains 'why this matches me'.",
        "Filter by what you're working on right now.",
      ],
      why: "You can use a resource without asking 'what is this?' first.",
    },
    parent: {
      headline: "Resources for your family — picked to match the plan.",
      bullets: [
        "Filter to family-facing materials and CT-specific services.",
        "Save resources to revisit with your student.",
        "Each card shows 'how to use it' so you're not guessing.",
      ],
      why: "Less time researching, more time supporting.",
    },
    educator: {
      headline: "Resources you can assign or share into the action plan.",
      bullets: [
        "Filter by category, format, and grade band.",
        "Attach a resource directly to a goal or 30-day step.",
        "Sample worksheets and family-friendly explainers built in.",
      ],
      why: "Spend planning time on the student, not on link hunting.",
    },
    school: {
      headline: "Which resources caseloads are actually using.",
      bullets: [
        "Top-used resources by category.",
        "Coverage gaps (categories with no engagement).",
        "Aggregate — no per-student detail.",
      ],
      why: "Invest staff time in the resources teams already trust.",
      privacy: "Aggregate use only — no student-level activity.",
    },
    district: {
      headline: "Resource adoption across schools — see what's working district-wide.",
      bullets: [
        "Compare resource use by school.",
        "Spot equity gaps in resource reach.",
        "Plan PD or family events around top categories.",
      ],
      why: "Spread what works, replace what doesn't.",
      privacy: "Aggregate use only.",
    },
    partner: {
      headline: "Partner-contributed resources show up here too.",
      bullets: [
        "See which of your resources are surfacing to which categories.",
        "Update your descriptions and next-step instructions.",
        "Anonymous engagement counts — no student identities.",
      ],
      why: "Improve the resources you offer based on real engagement.",
      privacy: "No student identifying information.",
    },
    platform: {
      headline: "Resource catalog moderation + quality.",
      bullets: [
        "Approve, edit, or retire submitted resources.",
        "Flagged content queue.",
        "Engagement trends by category.",
      ],
      why: "Keep the catalog trustworthy and current.",
      privacy: "Operational metrics only.",
    },
  },
  opportunities: {
    student: {
      headline: "Real programs, apprenticeships, and shadow days matched to your goals.",
      bullets: [
        "Each card shows eligibility and the very next step.",
        "Save ones you want to discuss with family.",
        "Opt in to share interest — only then is your name shared.",
      ],
      why: "See what's actually available, not just what's in a brochure.",
    },
    parent: {
      headline: "Opportunities matched to your child — with eligibility in plain language.",
      bullets: [
        "Filter by program type and location.",
        "Bookmark for the next conversation with the case manager.",
        "You control whether interest is shared with the partner.",
      ],
      why: "Families compare options without having to call each provider.",
    },
    educator: {
      headline: "Opportunities to fold into goals, the action plan, or meeting prep.",
      bullets: [
        "Attach an opportunity directly to a 30/60/90-day step.",
        "See match rationale (what in the plan triggered it).",
        "Track which referrals have moved into next-step status.",
      ],
      why: "Turn matches into measurable action quickly.",
    },
    school: {
      headline: "Opportunity engagement across the caseload.",
      bullets: [
        "Counts of matches, saves, and outreach by category.",
        "Trends by partner type (apprenticeship, employment, college).",
        "Aggregate — no per-student detail.",
      ],
      why: "Confirm partners are reaching students in the right mix.",
      privacy: "Aggregate only.",
    },
    district: {
      headline: "Opportunity reach across schools — and where the gaps are.",
      bullets: [
        "Compare match volume school-by-school.",
        "Identify partner-thin geographies.",
        "Plan partner recruitment with evidence.",
      ],
      why: "Build a partner network that matches student demand.",
      privacy: "Aggregate only.",
    },
    partner: {
      headline: "Your opportunities — how many students are matched, saved, or interested.",
      bullets: [
        "Edit eligibility, location, and next steps.",
        "Anonymous interest counts at the opportunity level.",
        "PartnerForward incentives surface here.",
      ],
      why: "Reach more of the right students without ever seeing private data.",
      privacy: "Strict opportunity-level privacy — no PII.",
    },
    platform: {
      headline: "Opportunity catalog operations.",
      bullets: [
        "Approval queue for new partner opportunities.",
        "Flagged content moderation.",
        "Match volume and quality metrics.",
      ],
      why: "Keep the partner catalog clean and credible.",
      privacy: "Operational metrics only.",
    },
  },
  plan: {
    student: {
      headline: "Your 30 / 60 / 90-day plan — one step at a time.",
      bullets: [
        "Each step lists who owns it and when it's done.",
        "Check off completed steps to see your progress.",
        "Steps trace back to your voice and your goals.",
      ],
      why: "Big plans feel doable when broken into small, dated steps.",
    },
    parent: {
      headline: "The family's 30 / 60 / 90-day plan — clear owners, clear timing.",
      bullets: [
        "Family-owned steps surface first.",
        "Each step shows the source (voice, IEP, educator).",
        "Print or share to the family calendar in one click.",
      ],
      why: "Families know exactly what's theirs and what's the team's.",
    },
    educator: {
      headline: "Action plan by horizon — assign, adjust, and track from one view.",
      bullets: [
        "Reassign owners as roles shift.",
        "Attach resources or opportunities to a step.",
        "Mark complete to update the student's overall progress.",
      ],
      why: "Less spreadsheet juggling between meetings.",
    },
    school: {
      headline: "Plan-completion trends across the caseload.",
      bullets: [
        "Percent of 30-day steps completed on time.",
        "Bottlenecks by category (transportation, self-advocacy).",
        "Aggregate — no per-step content.",
      ],
      why: "Spot where caseloads need more support.",
      privacy: "Aggregate only.",
    },
    district: {
      headline: "Plan adoption + completion across schools.",
      bullets: [
        "School-by-school plan completion.",
        "Equity view: completion by student group.",
        "No individual plan contents at this level.",
      ],
      why: "Direct district support where plans stall.",
      privacy: "Aggregate only.",
    },
    partner: {
      headline: "Partners don't see the action plan.",
      bullets: [
        "Partners only see steps the family explicitly opts to share.",
        "Even then, only the opportunity-level next step is visible.",
        "No goals, IEP language, or owner details surfaced.",
      ],
      why: "Plans stay inside the care-team consent boundary.",
      privacy: "Plans are never shared with partners by default.",
    },
    platform: {
      headline: "Plan-engine health — generation, completion, and drift.",
      bullets: [
        "Average steps per plan, by horizon.",
        "Time-to-first-completed-step.",
        "Failures or stuck plans.",
      ],
      why: "Keep the plan engine giving useful next steps.",
      privacy: "Operational metrics only.",
    },
  },
  hub: {
    student: {
      headline: "Your hub — one place for goals, documents, meetings, and what's next.",
      bullets: [
        "Pick up where you left off.",
        "Open the report, plan, or calendar from one screen.",
        "Saved opportunities and resources live here.",
      ],
      why: "One screen, not seven tabs.",
    },
    parent: {
      headline: "Family hub — every active thread for your student in one view.",
      bullets: [
        "See document status, upcoming meetings, and active goals.",
        "Open meeting prep before the next PPT.",
        "Invite a co-parent or trusted adult into the care team.",
      ],
      why: "Stay informed without becoming the case manager.",
    },
    educator: {
      headline: "Caseload-aware hub for this student.",
      bullets: [
        "Quick switch between students on your caseload.",
        "Action items, review queue, and case notes side-by-side.",
        "Private notes stay with you.",
      ],
      why: "Less time hunting, more time planning.",
    },
    school: {
      headline: "School-level implementation snapshot — not a private student view.",
      bullets: [
        "Reports completed, plans active, follow-ups due.",
        "Coverage and staffing indicators.",
        "Drill-downs open educator views, not private profiles.",
      ],
      why: "Verify implementation health without invading privacy.",
      privacy: "Private student detail is hidden here.",
    },
    district: {
      headline: "District-level snapshot — adoption, progress, equity.",
      bullets: [
        "School-by-school progress.",
        "Where implementation support is needed.",
        "Aggregate transition reporting.",
      ],
      why: "Make rollout decisions on real evidence.",
      privacy: "District view never exposes private student detail.",
    },
    partner: {
      headline: "Partner workspace — profile, opportunities, incentives.",
      bullets: [
        "See opportunity-level interest, never student detail.",
        "Update your listings and next-step instructions.",
        "Track PartnerForward incentives.",
      ],
      why: "Reach the right students without ever seeing private data.",
      privacy: "Strict opportunity-level privacy.",
    },
    platform: {
      headline: "Operator hub — queues, approvals, system health.",
      bullets: [
        "Waitlist and partner approval pipelines.",
        "Resource moderation queue.",
        "Launch-readiness checklist.",
      ],
      why: "Operate the network safely and transparently.",
      privacy: "Admin access is logged.",
    },
  },
};

