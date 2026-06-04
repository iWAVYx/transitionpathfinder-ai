// Read-only demo fixture for "Demo Mode". Clearly badged so it cannot be
// confused with real student data. No DB writes happen for this student.

export const DEMO_STUDENT = {
  id: "demo-student",
  first_name: "Jordan",
  last_name: "Rivera (Demo)",
  grade: "11",
  age: 17,
  diagnosis: "Autism Spectrum Disorder, ADHD",
  pronouns: "they/them",
  strengths: [
    "Strong visual memory",
    "Detail-oriented with patterns",
    "Patient with younger kids",
    "Skilled with hands-on building",
  ],
  interests: [
    "Video game design",
    "Animals (especially dogs)",
    "Music production",
    "Cooking with family",
  ],
  needs: [
    "Quiet workspace for focus",
    "Clear written instructions",
    "Extra time on multi-step tasks",
    "Breaks during long meetings",
  ],
  voice: {
    after_high_school: "I want to keep learning about computers and maybe work with animals too.",
    good_at: "I notice small details that other people miss, and I'm really patient.",
    support: "When teachers write things down for me instead of just saying them.",
  },
};

export const DEMO_PATHWAYS = [
  {
    title: "Community College + Animal Care Certificate",
    fit: "High",
    why: "Combines structured academic support with hands-on work matching Jordan's interest in animals.",
  },
  {
    title: "Game Design Pre-Apprenticeship",
    fit: "Medium-High",
    why: "Builds on visual memory and pattern strengths; needs accommodations for group projects.",
  },
  {
    title: "Supported Employment + Part-time Coursework",
    fit: "Medium",
    why: "Slower-paced track that lets Jordan develop work skills while exploring interests.",
  },
];

export const DEMO_NEXT_STEPS = {
  "30": [
    "Schedule a transition planning meeting with the IEP team.",
    "Visit local community college disability services office.",
  ],
  "90": [
    "Tour a veterinary clinic or animal shelter for informational interview.",
    "Complete a career interest inventory together.",
  ],
  "180": [
    "Apply for a summer transition program.",
    "Begin self-advocacy skills practice with school counselor.",
  ],
  "365": [
    "Decide on post-secondary path (CC vs. work-first).",
    "Set up adult services connections (DDS, ABLE account).",
  ],
};

export const DEMO_RESOURCES = [
  { title: "Connecticut Transition Task Force — Family Guide", category: "Family Education" },
  { title: "Project SEARCH Hartford — Internship Program", category: "Work Experience" },
  { title: "ABLE Account Setup — Plain Language Guide", category: "Financial Planning" },
];
