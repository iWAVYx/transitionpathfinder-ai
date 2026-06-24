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

export interface DocumentInsight {
  area: string;
  summary: string;
  source: string;
  needsReview?: boolean;
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
