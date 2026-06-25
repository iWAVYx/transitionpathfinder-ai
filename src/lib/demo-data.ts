import type { PathwayReport, IntakeInput } from "@/lib/pathway.functions";

export const DEMO_STUDENT = {
  first_name: "Maya",
  full_name: "Maya Rivera",
  pronouns: "she/her",
  grade: "11th grade",
  school: "East Hartford High School",
  district: "East Hartford Public Schools",
  age: 17,
  case_manager: "Ms. Alvarez",
  disability_category: "Autism Spectrum (primary) · ADHD (secondary)",
  graduation_year: "Spring 2027",
};

export const DEMO_INTAKE: IntakeInput = {
  submitter_role: "family",
  student_first_name: "Maya",
  grade_band: "11-12",
  strengths:
    "Patient and gentle with animals — walks the family dog every morning. Detailed observer (notices things others miss). Strong visual memory; can recreate drawings from memory. Reliable when routines are clear and expectations are written down.",
  interests:
    "Animals (especially dogs and birds), drawing and digital art, environmental clean-ups, baking, watching nature documentaries, organizing her bookshelf by color.",
  needs:
    "Sensory sensitivity to loud, unpredictable noise (cafeteria, fire drills). Needs extra processing time for verbal instructions. Anxiety in new social situations. Benefits from written checklists and a quiet break space.",
  supports:
    "Visual schedules, written step-by-step directions, 1:1 check-ins at the start of class, advance notice of changes, noise-reducing headphones, small-group instruction.",
  transportation:
    "Currently rides the school bus. Has not started driver's ed. Family is open to public transit training through the school.",
  communication:
    "Verbal but quiet. Prefers texting over calls. Will advocate for herself once she knows it's safe — needs a trusted adult to open the door.",
  current_goals:
    "Maya will increase self-advocacy by independently requesting accommodations in 4 of 5 opportunities. Maya will identify 3 postsecondary career interests and complete a job-shadow experience by end of 11th grade.",
  family_concerns:
    "Worried about life after high school — whether Maya can hold a job, manage money, and live semi-independently. Want her to find work she actually enjoys, not just any job. Need help understanding adult services (BRS, DDS).",
  student_voice:
    "I want to work with animals. Maybe a vet office or a shelter. I don't want to go to a big college but I'd try community college if it's not too loud. I want my own apartment someday with a cat.",
  family_voice:
    "We want Maya to feel proud of what she can do. We need a plan that builds her independence step by step — not all at once. We also want to know what supports are available after she ages out at 22.",
  educator_input:
    "Maya is making strong gains in self-advocacy this year. She volunteered at the school food pantry and was reliable every week. She struggles with unstructured time and benefits from job-embedded learning. Recommend exploring CT BRS pre-employment transition services this spring.",
  communication_prefs:
    "Texts and written notes preferred. Email works if it's short. Phone calls only with people she already trusts.",
  transportation_needs:
    "Will need travel-training support before riding city or regional transit independently. Family can drive to job-shadow sites within East Hartford.",
  family_priorities:
    "Independence built in small steps · Real, paying work she enjoys · Clear picture of adult services after age 21 · Protecting Maya's mental health throughout.",
  family_concerns_extended:
    "Worried about benefits cliffs if Maya earns income, navigating BRS/DDS intake, and what supported-living options actually look like in Hartford County.",
  student_worries:
    "Loud places, group interviews, being put on the spot. Doesn't want to disappoint her parents if a path doesn't work out.",
  services_received:
    "Special education (autism), speech-language services, school counseling check-ins (weekly), assistive tech (noise-reducing headphones), 1:1 paraprofessional during electives.",
  desired_postsecondary_outcomes:
    "Part-time paid work in animal care within 1 year of graduation. Community-college certificate (animal care or vet assistant) by age 21. Semi-independent apartment by age 23 with check-ins.",
  upcoming_meetings:
    "Annual PPT — April 8, 2026 · Transition planning meeting — May 2026 · BRS intake referral — Spring 2026.",
};

export const DEMO_REPORT: PathwayReport = {
  summary:
    "Maya is a thoughtful, observant 11th grader who lights up around animals and quiet, hands-on work. She learns best with clear routines, written steps, and a trusted adult in her corner. With the right introductions — and time to build comfort — she has a strong, realistic path toward animal care or environmental work in Connecticut.",

  strengths_snapshot: [
    "Patient and calm with animals — a natural caregiver",
    "Reliable and consistent when routines are clear",
    "Detailed observer who notices things others miss",
    "Creative thinker — strong visual memory and artistic eye",
    "Self-aware about what helps her focus",
  ],

  encouragement_to_student:
    "Maya, the world needs people who notice the quiet things — the way an animal is feeling, the small details no one else sees. You don't have to figure out everything at once. One visit, one conversation, one tiny step at a time. We've got you.",

  student_snapshot: {
    grade_level: "11th grade · East Hartford High School",
    graduation_timeline: "On track for a standard diploma · Spring 2027",
    primary_interests: ["Animal care", "Visual art & drawing", "Environmental science", "Baking"],
    learning_preferences: [
      "Visual instructions and demonstrations",
      "Written checklists over spoken directions",
      "Small groups or 1:1 instead of whole class",
      "Quiet workspaces with predictable routines",
    ],
    communication_style:
      "Quiet but thoughtful — Maya communicates clearly once she trusts the listener. Prefers texting and written notes; needs a few extra seconds to organize a verbal response.",
    current_transition_status:
      "Self-advocacy is emerging this year. She has not yet completed a paid work experience, formal vocational assessment, or community-based instruction, but she volunteered weekly at the school food pantry and asked her teacher about animal-shelter volunteering.",
    readiness_level: "developing",
    family_priorities: [
      "Build independence in small, real-world steps",
      "Find work Maya genuinely enjoys",
      "Understand adult services available after age 21",
      "Protect Maya's mental health throughout the transition",
    ],
    student_voice_quote:
      "I want to work somewhere with animals. Quiet is better. I want to learn how to ride the bus by myself.",
  },

  spin_analysis: {
    strengths: [
      "Empathy and patience with living things",
      "Visual learning and recall",
      "Follows routines reliably",
      "Notices fine details others miss",
    ],
    preferences: [
      "Predictable, quiet environments",
      "Written or visual instructions",
      "Working alongside one trusted person",
      "Hands-on tasks with a clear end point",
    ],
    interests: [
      "Animal care (dogs, cats, small mammals, birds)",
      "Environmental clean-up and conservation",
      "Drawing, illustration, and digital art",
      "Baking and following recipes",
    ],
    needs: [
      "Advance notice of schedule changes",
      "Quiet break space when overwhelmed",
      "Extra processing time for verbal directions",
      "Support starting unfamiliar tasks",
    ],
    motivators: [
      "Helping animals feel safe",
      "Earning her own money for art supplies",
      "Adults who explain the 'why' behind a task",
    ],
    barriers: [
      "Sensory overload in loud, unpredictable settings",
      "Social anxiety with unfamiliar adults",
      "Limited transportation independence",
    ],
    environmental_supports: [
      "Family who advocates and follows through",
      "Strong relationship with case manager Ms. Alvarez",
      "School food-pantry placement she already trusts",
    ],
    areas_for_growth: [
      "Independent travel skills (bus, planning a route)",
      "Asking for help from a new adult",
      "Money management and using a debit card",
    ],
    what_this_means:
      "Maya's strengths and interests point in the same direction: calm, hands-on, animal- or nature-centered work. Her needs are real but well-understood. The next year should focus on real-world exposure (shelter visit, job shadow) and small independence wins (one bus route, one purchase, one phone call) — not on pushing her toward a four-year college path that isn't a fit.",
  },

  recommended_pathways: [
    {
      type: "best-fit",
      title: "Animal Care & Shelter Support",
      why_it_fits:
        "Combines Maya's genuine love of animals with her patient, detail-oriented, routine-loving work style. Entry points exist locally through volunteering, technical high school programs, and community college vet-tech tracks.",
      related_strengths: ["Patience with animals", "Reliable routines", "Detailed observation"],
      possible_barriers: ["Loud kennel environments", "Lifting heavy bags or large dogs", "Transportation to shelter"],
      supports_needed: [
        "Noise-reducing headphones for kennel areas",
        "A consistent shift supervisor",
        "Family/agency support for transportation",
      ],
      school_experiences: [
        "Volunteer placement at a local animal shelter (2 hrs/week)",
        "Connect with the agriscience program at a CT technical high school for a tour",
        "Career interest inventory focused on animal/veterinary clusters",
      ],
      community_experiences: [
        "Visit Connecticut Humane Society or a local rescue",
        "Shadow a kennel technician for half a day",
        "Attend a 4-H or animal-care community event",
      ],
      courses_or_programs: [
        "Animal Science elective if offered at EHHS",
        "CT community college Veterinary Technology intro course (audit option)",
        "Red Cross Pet First Aid certification",
      ],
      career_clusters: ["Agriculture, Food & Natural Resources", "Health Science (animal care track)"],
      credentials: [
        "Volunteer hours log",
        "Pet First Aid certificate",
        "OSHA-10 safety card (entry level)",
      ],
      partner_resources: [
        "Connecticut Bureau of Rehabilitation Services (BRS) — Pre-ETS",
        "Local animal shelter volunteer coordinator",
        "School transition coordinator",
      ],
      action_steps: {
        thirty_day: [
          "Tour one local animal shelter together as a family",
          "Email Ms. Alvarez to request a BRS Pre-ETS referral",
          "Add 'animal care exploration' to Maya's spring IEP goals",
        ],
        ninety_day: [
          "Begin a weekly 2-hour volunteer shift at a shelter or rescue",
          "Complete an interest inventory and one informational interview",
          "Practice the bus route to the volunteer site twice with a trusted adult",
        ],
        six_month: [
          "Earn Pet First Aid certificate",
          "Complete a 1-day job shadow with a veterinary assistant",
          "Add the placement to Maya's transition portfolio",
        ],
        one_year: [
          "Try a paid summer placement (with BRS support if eligible)",
          "Tour the vet-tech program at a CT community college open house",
          "Decide together: continue this path, or sample a related one (groomer, kennel tech, wildlife rehab)",
        ],
      },
    },
    {
      type: "exploration",
      title: "Visual Art & Illustration",
      why_it_fits:
        "Maya draws every day and has a strong visual memory. Worth exploring whether art could be a paid skill (pet portraits, environmental illustration) or a stabilizing hobby that protects her mental health.",
      related_strengths: ["Visual memory", "Patience for detail work", "Creative thinking"],
      possible_barriers: ["Inconsistent income from freelance art", "Self-promotion requires social skills she is still building"],
      supports_needed: ["A mentor artist", "Help setting up a simple online portfolio"],
      school_experiences: [
        "Continue art electives at EHHS",
        "Submit a piece to the district art show",
        "Connect with the school art teacher about a portfolio project",
      ],
      community_experiences: [
        "Visit New Britain Museum of American Art with family",
        "Attend a community art walk or maker fair",
        "Volunteer to illustrate a flyer for the animal shelter",
      ],
      courses_or_programs: [
        "Digital art or graphic design elective",
        "Community college noncredit art workshop",
      ],
      career_clusters: ["Arts, A/V Technology & Communications"],
      credentials: ["Portfolio of 8–10 finished pieces", "One commissioned piece"],
      partner_resources: ["School art teacher", "Local library maker space"],
      action_steps: {
        thirty_day: [
          "Pick 3 favorite pieces to start a simple portfolio folder",
          "Ask the art teacher about a portfolio review",
        ],
        ninety_day: [
          "Complete one piece for a real audience (shelter flyer, family gift)",
          "Visit one local art event",
        ],
        six_month: [
          "Decide: keep as a stabilizing hobby, or try one paid commission",
        ],
        one_year: [
          "Decide together whether art is a side path or a primary direction",
        ],
      },
    },
    {
      type: "stretch",
      title: "Environmental Field Work",
      why_it_fits:
        "Maya cares deeply about the environment and enjoys being outside. A stretch direction if she builds comfort with new groups and outdoor settings — entry roles exist at state parks and conservation nonprofits.",
      related_strengths: ["Observation skills", "Patience for repetitive outdoor tasks"],
      possible_barriers: [
        "Group fieldwork involves unfamiliar peers",
        "Weather and bug exposure may be a sensory challenge",
      ],
      supports_needed: [
        "Start with a one-day clean-up before committing to a season",
        "A peer buddy or trusted adult on each outing",
      ],
      school_experiences: [
        "Join an environmental club or eco-team",
        "Complete a science project on a local watershed",
      ],
      community_experiences: [
        "Volunteer at a Connecticut River clean-up",
        "Visit a local state park nature center",
      ],
      courses_or_programs: ["Intro Environmental Science elective"],
      career_clusters: ["Agriculture, Food & Natural Resources"],
      credentials: ["Volunteer hours log", "Park ambassador badge"],
      partner_resources: ["CT DEEP volunteer programs", "Local land trust"],
      action_steps: {
        thirty_day: ["Attend one community clean-up event"],
        ninety_day: ["Try a second outing — same group if possible"],
        six_month: ["Decide whether to pursue regular volunteering"],
        one_year: ["Consider a summer parks crew if comfortable"],
      },
    },
  ],

  career_pathways: [
    {
      title: "Animal Care & Shelter Support",
      why_it_fits: "Patient with animals, thrives in calm routines, already curious about volunteering at a shelter.",
      example_roles: ["Animal shelter volunteer", "Kennel technician", "Veterinary assistant", "Pet groomer's assistant"],
      first_steps: ["Tour a local shelter", "Request a BRS Pre-ETS referral", "Begin a weekly volunteer shift"],
    },
    {
      title: "Visual Art & Illustration",
      why_it_fits: "Daily drawing practice, strong visual recall, careful with detail.",
      example_roles: ["Pet portrait artist", "Greeting card illustrator", "Library program illustrator"],
      first_steps: ["Build a simple portfolio", "Complete one commissioned piece for a real audience"],
    },
  ],

  career_matches: [
    {
      cluster: "Animal Care",
      example_jobs: ["Kennel technician", "Vet office receptionist", "Shelter caregiver", "Pet day-care assistant"],
      skills_required: ["Patience", "Following routines", "Basic animal handling", "Cleaning protocols"],
      education_needed: "High school diploma; optional vet-tech certificate at a CT community college (2 years).",
      work_environment:
        "Indoor kennels (can be loud) or quieter vet offices. Physical work — bending, lifting up to 25 lbs, standing for shifts.",
      accommodations: ["Noise-reducing headphones in kennels", "Written task checklists", "Consistent supervisor", "Predictable shift schedule"],
      readiness_level: "developing",
      next_step: "Schedule a half-day shadow at a local vet office or shelter.",
    },
    {
      cluster: "Arts & Creative Production",
      example_jobs: ["Freelance illustrator", "Greeting card designer", "Library program assistant"],
      skills_required: ["Drawing fundamentals", "Following a creative brief", "Meeting a deadline"],
      education_needed: "Portfolio matters more than degree. Optional community college art certificate.",
      work_environment: "Mostly independent, mostly at home or in a studio. Quiet, flexible hours.",
      accommodations: ["Written briefs instead of verbal", "Extended deadlines when needed", "Mentor check-ins"],
      readiness_level: "emerging",
      next_step: "Complete one piece for a real audience (animal shelter flyer is a perfect first commission).",
    },
    {
      cluster: "Environmental & Outdoor Work",
      example_jobs: ["State park ambassador", "Conservation crew member", "Garden center assistant"],
      skills_required: ["Following safety protocols", "Working outdoors in varied weather", "Basic plant or animal ID"],
      education_needed: "High school diploma plus on-the-job training. AmeriCorps options available.",
      work_environment: "Mostly outdoors, often in small crews. Variable noise and weather.",
      accommodations: ["Predictable crew assignments", "Clear daily task list", "Sensory breaks scheduled in"],
      readiness_level: "emerging",
      next_step: "Try one weekend clean-up before committing to a longer season.",
    },
  ],

  readiness_scorecard: [
    {
      category: "Self-advocacy",
      level: "developing",
      evidence: "Asked Ms. Alvarez about animal-shelter volunteering this fall and shared her interests during a parent-teacher conference.",
      what_it_means: "Maya can speak up in safe, familiar settings. Next step is doing this with one new adult.",
      growth_activity: "Practice introducing herself and her accommodations to one new teacher each quarter.",
      suggested_goal: "Maya will independently request accommodations from at least one new adult in 4 of 5 opportunities.",
    },
    {
      category: "Career awareness",
      level: "developing",
      evidence: "Has named three real interests (animals, art, environment) but has not yet done a job shadow.",
      what_it_means: "She has a clear starting point. Real-world exposure is the unlock.",
      growth_activity: "Complete one job shadow and one informational interview this school year.",
      suggested_goal: "By June, Maya will complete 1 job shadow and 1 informational interview in an area of interest.",
    },
    {
      category: "Independent travel",
      level: "emerging",
      evidence: "Rides the school bus reliably; has never independently planned or taken a public bus route.",
      what_it_means: "Travel training is the highest-leverage independence skill for the next year.",
      growth_activity: "Practice one CTtransit route with a trusted adult, then with phone GPS, then solo.",
      suggested_goal: "Maya will independently complete one familiar CTtransit round-trip by end of 12th grade.",
    },
    {
      category: "Financial literacy",
      level: "emerging",
      evidence: "Has a savings account; has not yet used a debit card independently.",
      what_it_means: "Small, real-world money practice will build fast confidence.",
      growth_activity: "Use a prepaid debit card for weekly small purchases with a follow-up review.",
      suggested_goal: "Maya will independently make 3 purchases per week using a debit card and track them in a notebook.",
    },
    {
      category: "Communication with adults",
      level: "developing",
      evidence: "Texts case manager; reluctant to make phone calls.",
      what_it_means: "Build a phone-call script and practice in low-stakes settings.",
      growth_activity: "Practice scripted calls (appointment reminders, simple questions) once a week.",
      suggested_goal: "Maya will independently make 2 scripted phone calls per month with no more than one prompt.",
    },
    {
      category: "Daily living & routines",
      level: "progressing",
      evidence: "Maintains personal hygiene, manages morning routine, helps with cooking at home.",
      what_it_means: "Strong foundation — next is generalizing to less familiar settings.",
      growth_activity: "Prepare one simple meal for the family per week, fully independently.",
      suggested_goal: "Maya will plan, shop for, and prepare one meal per week with no prompts by end of school year.",
    },
  ],

  postsecondary_goals: [
    {
      area: "Education / Training",
      current_status:
        "Maya is on track for a standard diploma in 2027. She has expressed willingness to try community college if the environment is quiet.",
      suggested_direction:
        "Explore non-degree certificate options at a CT community college (vet-tech intro, animal care) before committing to a degree path.",
      why_it_matters:
        "A short, low-stakes certificate lets Maya test 'is college something I can do?' without a four-year commitment.",
      measurable_goal_language:
        "After completing high school, Maya will enroll in at least one credit-bearing or noncredit course at a Connecticut community college in an area of interest within 12 months of graduation.",
      next_steps: [
        "Tour one CT community college campus during a quiet visit day",
        "Meet with the disability services office to understand supports",
        "Audit one noncredit course in 12th grade",
      ],
      who_supports: ["Family", "School transition coordinator", "Community college disability services"],
      evidence_needed: ["Campus visit reflection", "Disability services intake completed"],
    },
    {
      area: "Employment",
      current_status:
        "No paid work experience yet. Reliable volunteer at the school food pantry. Interested in animal-related work.",
      suggested_direction:
        "Build a volunteer-to-paid-work ladder: volunteer at a shelter, then job shadow, then a supported summer placement (potentially through BRS).",
      why_it_matters:
        "Real work history before graduation predicts adult employment outcomes more than any single assessment.",
      measurable_goal_language:
        "After completing high school, Maya will be employed in a community-based job in an area of interest (animal care, art, or environmental work) for at least 10 hours per week.",
      next_steps: [
        "Refer to CT BRS for Pre-Employment Transition Services this spring",
        "Begin a weekly volunteer shift at an animal shelter",
        "Complete one job shadow before end of 11th grade",
      ],
      who_supports: ["BRS counselor", "Case manager", "Family", "Volunteer site supervisor"],
      evidence_needed: ["BRS application submitted", "Volunteer log", "Job-shadow reflection"],
    },
    {
      area: "Independent Living",
      current_status:
        "Lives at home, manages personal hygiene and morning routine, helps with cooking. Has not lived away from family overnight independently.",
      suggested_direction:
        "Build toward semi-independent living: one cooking task per week, one solo errand per month, one overnight away from home before graduation.",
      why_it_matters:
        "Independence is built in small reps over time — not at age 21 when adult services begin.",
      measurable_goal_language:
        "After completing high school, Maya will live in a setting of her choice with the level of support needed (family home, supported apartment, or shared living).",
      next_steps: [
        "Add one independent daily-living task per quarter",
        "Practice solo errands (pharmacy, grocery for 3 items)",
        "Explore CT DDS adult services eligibility before age 18",
      ],
      who_supports: ["Family", "Case manager", "Future DDS service coordinator"],
      evidence_needed: ["Daily-living checklist tracking", "DDS eligibility application started"],
    },
    {
      area: "Community Participation & Transportation",
      current_status:
        "Rides school bus; has never independently used public transit. Family drives her to most community activities.",
      suggested_direction:
        "Begin travel training with CTtransit, starting with one short, familiar round-trip route.",
      why_it_matters:
        "Without transportation, every other postsecondary goal becomes harder. This is the single highest-leverage skill for the next 18 months.",
      measurable_goal_language:
        "Before graduation, Maya will independently complete at least one familiar CTtransit round-trip route to a community location of her choice.",
      next_steps: [
        "Request travel training through the school district",
        "Practice one route 3 times with an adult before going solo",
        "Add 'travel training' to the spring IEP",
      ],
      who_supports: ["Case manager", "Travel-training instructor", "Family"],
      evidence_needed: ["Travel-training completion certificate", "Independent trip log"],
    },
  ],

  iep_translator: [
    {
      goal_text:
        "Maya will increase self-advocacy by independently requesting accommodations in 4 of 5 opportunities.",
      plain_meaning:
        "Maya will get better at asking for what she needs (like a quiet space or written directions) on her own, without a teacher reminding her.",
      connected_services: ["Case management check-ins", "Counselor coaching", "Self-advocacy curriculum"],
      questions_to_ask: [
        "How is 'independently' being measured?",
        "Who is recording these 5 opportunities?",
        "What happens in the 1 of 5 she doesn't ask?",
      ],
      what_student_should_know:
        "You're being asked to practice using your voice. The team is watching to celebrate when you do — not to catch you when you don't.",
      connected_to_real_life:
        "This is the exact same skill you'll need at a vet office, in a college classroom, or with a future landlord.",
      missing_information: ["What 'opportunities' counts? Defined by whom?", "What baseline is this measured against?"],
    },
    {
      goal_text:
        "Maya will identify 3 postsecondary career interests and complete a job-shadow experience by end of 11th grade.",
      plain_meaning:
        "By June, Maya should be able to name three jobs or career areas she's curious about, and she should have visited at least one workplace to see what it's actually like.",
      connected_services: ["Pre-ETS through BRS", "Transition coordinator support", "Career interest inventory"],
      questions_to_ask: [
        "Who is arranging the job shadow?",
        "Does the family need to drive, or is transportation provided?",
        "Will the school accept a community-arranged shadow if we set one up?",
      ],
      what_student_should_know:
        "You don't have to pick a 'forever job' — just three things you'd want to look at up close. And you only need to actually visit one of them this year.",
      connected_to_real_life:
        "Career exploration in 11th grade is how most students figure out what comes after high school.",
      missing_information: ["Target date for the job shadow", "Backup plan if the first arrangement falls through"],
    },
  ],

  data_gaps: [
    {
      item: "Current vocational assessment results",
      why_it_matters: "Without a current assessment, recommendations are based on family/school observation only.",
      who_can_help: "School psychologist or transition coordinator",
      how_to_collect: "Request a vocational assessment at the next PPT.",
      question_to_ask: "Has Maya had a formal vocational assessment in the last 2 years? Can we add one this spring?",
    },
    {
      item: "CT BRS / Pre-ETS eligibility status",
      why_it_matters: "BRS Pre-Employment Transition Services unlock paid work experiences and travel training.",
      who_can_help: "Case manager and a local BRS counselor",
      how_to_collect: "Request a referral letter at the next PPT and call the BRS regional office.",
      question_to_ask: "Has Maya been referred to BRS yet? If not, can we start that process this month?",
    },
    {
      item: "DDS eligibility before age 18",
      why_it_matters: "Connecticut DDS adult-services eligibility must be applied for, not granted automatically. Missing the window can delay supports after graduation.",
      who_can_help: "Family, case manager, or a local family-advocacy organization",
      how_to_collect: "Submit a DDS eligibility application before Maya turns 18.",
      question_to_ask: "Has the team started Maya's DDS eligibility application? What documents are needed?",
    },
  ],

  student_voice_prompts: [
    {
      prompt: "What kind of place would I want to wake up and go to every day?",
      suggested_reflection: "Think about noise, light, who's around you, indoors or outdoors.",
    },
    {
      prompt: "Who is one adult I trust outside my family? Could they help me try something new?",
      suggested_reflection: "A trusted adult is one of the biggest predictors of a smooth transition.",
    },
    {
      prompt: "If I could shadow any job for one day, what would it be?",
      suggested_reflection: "Your first job shadow doesn't have to be your forever job. It just has to be real.",
    },
    {
      prompt: "What's one small thing I'd like to do by myself this year?",
      suggested_reflection: "Take the bus once. Order food. Make one phone call. Pick one and try it.",
    },
    {
      prompt: "What do I want adults to stop doing for me?",
      suggested_reflection: "Independence often starts with someone else stepping back.",
    },
  ],

  family_action_plan: {
    this_week: [
      "Read this report together at the kitchen table",
      "Pick one shelter or vet office to call about a tour",
      "Text Ms. Alvarez to request the next PPT meeting",
    ],
    this_month: [
      "Tour one animal shelter or vet office",
      "Submit a BRS referral request",
      "Start a simple savings/spending notebook with Maya",
    ],
    before_next_meeting: [
      "Print this report and the Meeting Prep section",
      "Write down 3 questions in Maya's own words",
      "Decide together which 2 goals matter most this year",
    ],
    this_school_year: [
      "Complete one job shadow",
      "Begin weekly volunteering",
      "Start travel training on one CTtransit route",
    ],
    before_graduation: [
      "Submit DDS eligibility application",
      "Complete at least one paid summer placement",
      "Tour one CT community college on a quiet day",
    ],
  },

  teacher_action_plan: {
    goal_updates: [
      "Add travel-training objective to spring IEP",
      "Tighten self-advocacy goal with clearer measurement criteria",
      "Add one employment-related goal tied to volunteer placement",
    ],
    progress_monitoring: [
      "Weekly check-in log with Maya",
      "Volunteer site supervisor feedback form (monthly)",
    ],
    assessments_to_run: [
      "Updated vocational interest inventory",
      "Brigance Transition Skills Inventory (relevant subtests)",
    ],
    classroom_activities: [
      "Self-advocacy role-plays in resource room",
      "Career exploration unit tied to animal/environmental clusters",
    ],
    family_communication: [
      "Share this report with family before next PPT",
      "Schedule a 20-minute pre-PPT phone call",
    ],
    student_conference_questions: [
      "What part of the food-pantry placement do you like most?",
      "What would make a job shadow feel safe?",
      "Who's one adult outside school you trust?",
    ],
    service_connections: [
      "Initiate BRS Pre-ETS referral",
      "Begin DDS eligibility paperwork conversation with family",
    ],
    accommodations: [
      "Continue extended time and quiet break space",
      "Add written copy of all verbal directions in transition activities",
    ],
    work_based_learning: [
      "Coordinate weekly shelter volunteer placement",
      "Schedule one job shadow in spring semester",
    ],
  },

  meeting_prep_toolkit: {
    questions_to_ask: [
      "Has Maya been referred to BRS for Pre-ETS?",
      "When can travel training begin?",
      "Can we add an employment-related goal this spring?",
      "What's the plan for DDS eligibility before Maya turns 18?",
      "How will progress on self-advocacy be measured?",
    ],
    documents_to_bring: [
      "This Pathway Report",
      "Most recent IEP and progress reports",
      "Food-pantry volunteer log",
      "List of Maya's stated interests in her own words",
    ],
    concerns_to_raise: [
      "Maya has no paid work experience yet",
      "Travel independence has not been addressed",
      "DDS application has not been started",
    ],
    strengths_to_highlight: [
      "Reliable weekly food-pantry volunteer",
      "Clear, specific career interests",
      "Growing self-advocacy with familiar adults",
      "Strong family partnership",
    ],
    goals_to_review: [
      "Self-advocacy goal (refine measurement)",
      "Career exploration goal (add job-shadow date)",
      "Add travel-training goal",
    ],
    services_to_discuss: [
      "BRS Pre-ETS",
      "Travel training",
      "Community-based work experience",
      "Future DDS eligibility",
    ],
    student_voice_prompts: [
      "Ask Maya which goal feels most important to her",
      "Ask Maya what kind of placement she'd try first",
    ],
    follow_up_items: [
      "Confirm BRS referral within 2 weeks",
      "Schedule the shelter tour",
      "Share updated IEP draft with family before signing",
    ],
  },

  opportunity_matches: [
    {
      category: "Volunteer",
      name: "Weekly animal-shelter shift",
      why_it_fits: "Direct animal contact, predictable schedule, low social demands.",
      what_student_gains: "Real-world experience, references, confidence with a new adult.",
      readiness_level: "developing",
      how_to_explore: "Email the volunteer coordinator at a local shelter and ask for an orientation visit.",
      who_helps: "Family makes the initial call; case manager supports follow-up.",
    },
    {
      category: "Job shadow",
      name: "Half-day at a veterinary clinic",
      why_it_fits: "Lets Maya see the work without committing. Quieter than a kennel.",
      what_student_gains: "Realistic picture of vet-assistant work; a possible future contact.",
      readiness_level: "emerging",
      how_to_explore: "Ask Ms. Alvarez to coordinate through the district's career center.",
      who_helps: "Case manager and family.",
    },
    {
      category: "Service / agency",
      name: "CT Bureau of Rehabilitation Services (BRS) — Pre-ETS",
      why_it_fits: "Free pre-employment services for students with disabilities, including paid work experiences.",
      what_student_gains: "Access to job coaches, paid summer placements, and travel-training funding.",
      readiness_level: "developing",
      how_to_explore: "Request a referral letter at the next PPT meeting.",
      who_helps: "Case manager initiates referral; family completes the application.",
    },
    {
      category: "Community class",
      name: "Pet First Aid certification course",
      why_it_fits: "Short, structured, animal-focused — and gives Maya a real credential to show employers.",
      what_student_gains: "A line on her resume and proof she can complete a course.",
      readiness_level: "developing",
      how_to_explore: "Look up Red Cross Pet First Aid offerings in Hartford County.",
      who_helps: "Family signs her up; school can count as transition activity.",
    },
  ],

  progress_timeline: [
    {
      stage: "Self-awareness",
      status: "complete",
      description: "Maya can name her interests, her sensory needs, and at least one trusted adult.",
      milestones: ["Named 3 career interests", "Identified Ms. Alvarez as a trusted adult"],
    },
    {
      stage: "Career exploration",
      status: "in-progress",
      description: "Beginning real-world exposure through shelter visits and informational interviews.",
      milestones: ["Volunteer at school food pantry", "Tour of local animal shelter"],
      suggested_deadline: "Spring 2026",
    },
    {
      stage: "Work-based learning",
      status: "upcoming",
      description: "First job shadow, then weekly volunteering at a community site.",
      milestones: ["1 job shadow", "Weekly volunteer shift"],
      suggested_deadline: "End of 11th grade",
    },
    {
      stage: "Independent travel",
      status: "upcoming",
      description: "Travel training on one CTtransit route, building toward solo trips.",
      milestones: ["One route practiced with adult", "One independent round-trip"],
      suggested_deadline: "End of 12th grade",
    },
    {
      stage: "Adult-services connection",
      status: "future",
      description: "DDS eligibility submitted; BRS adult case opened.",
      milestones: ["DDS application submitted", "BRS adult case opened"],
      suggested_deadline: "Before age 18",
    },
    {
      stage: "Adult life transition",
      status: "future",
      description: "Paid employment, postsecondary class or training, semi-independent living plan.",
      milestones: ["10+ hrs/week paid work", "1 postsecondary course completed", "Living arrangement decision"],
      suggested_deadline: "By age 22",
    },
  ],

  confidence_level: "moderate",
  needs_human_review: [
    "Confirm current BRS / Pre-ETS eligibility with the case manager",
    "Validate DDS eligibility timeline with a CT-specific transition specialist",
    "Verify community college disability-services intake process before scheduling a visit",
  ],

  education_training_options: [
    "Audit one noncredit animal-care or art course at a CT community college",
    "Red Cross Pet First Aid certification",
    "School-based art electives and digital art workshops",
    "Travel-training program through the school district",
    "Self-advocacy curriculum during resource period",
  ],

  life_skills_focus: [
    "Independent CTtransit travel on one familiar route",
    "Using a prepaid debit card for weekly purchases",
    "Making scripted phone calls (appointments, simple questions)",
    "Planning and preparing one meal per week",
    "Requesting accommodations from a new adult",
  ],

  family_questions_for_ppt: [
    "Has Maya been referred to BRS for Pre-Employment Transition Services?",
    "Can travel training start this spring?",
    "What is the plan for DDS eligibility before Maya turns 18?",
    "How will progress on self-advocacy be measured?",
    "Can we add an employment-related goal tied to a real volunteer site?",
  ],

  teacher_next_steps: [
    "Submit BRS Pre-ETS referral within 2 weeks",
    "Coordinate one job shadow before end of spring semester",
    "Tighten self-advocacy goal measurement criteria",
    "Begin DDS eligibility conversation with family",
    "Add travel-training goal to spring IEP",
  ],

  thirty_day_plan: [
    { week: 1, action: "Read this report together as a family and pick the 2 goals that matter most." },
    { week: 2, action: "Email Ms. Alvarez to request a PPT meeting and a BRS referral." },
    { week: 3, action: "Tour one local animal shelter or vet office together." },
    { week: 4, action: "Bring this report and Maya's questions to the PPT meeting." },
  ],
};

/* =====================================================================
 * JORDAN — second demo student
 * 11th grade · creative, hands-on, strong verbal
 * Interests: digital media, music, entrepreneurship
 * Needs: organization, transportation, self-advocacy
 * ===================================================================*/

export const JORDAN_STUDENT = {
  first_name: "Jordan",
  full_name: "Jordan Bennett",
  pronouns: "he/him",
  grade: "11th grade",
  school: "New Haven Academy",
  district: "New Haven Public Schools",
  age: 17,
  case_manager: "Mr. Okafor",
  disability_category: "Specific Learning Disability · ADHD",
  graduation_year: "Spring 2027",
};

export const JORDAN_INTAKE: IntakeInput = {
  submitter_role: "family",
  student_first_name: "Jordan",
  grade_band: "11-12",
  strengths:
    "Creative and hands-on — builds beats in GarageBand, edits short videos for friends, sketches logo ideas in a notebook. Strong verbal communicator; tells stories in vivid detail and can pitch an idea on the spot. Natural connector — people listen when he talks.",
  interests:
    "Music production (beats, hip-hop, lo-fi), short-form video editing, sneakers and streetwear resale, podcasting, photography, helping cousins run a small T-shirt side hustle.",
  needs:
    "Disorganization — loses worksheets, forgets due dates, hands in strong work late. Struggles to break long projects into steps. Hard time getting himself to school on time without family driving him. Reluctant to ask teachers for help — masks confusion with humor.",
  supports:
    "Visual planner he actually opens (phone calendar with reminders), check-in at start and end of day, deadline scaffolding (1 step at a time), choice in how he shows what he knows (video over essay), trusted adult who 'gets' his creative side.",
  transportation:
    "Currently dropped off by his mom or older sister. Has a learner's permit but no consistent driving practice. Hasn't taken the city bus alone. Open to it if someone shows him once.",
  communication:
    "Very verbal — comfortable talking with adults he trusts. Avoids written email. Will text right back. Won't raise his hand in front of the whole class but will stay after to ask a question.",
  current_goals:
    "Jordan will improve work completion by submitting 80% of assignments on time across all classes. Jordan will identify 2 postsecondary pathways aligned to his creative interests by the end of 11th grade.",
  family_concerns:
    "Worried that grades hide how smart and capable he is. Doesn't want him to fall into 'community college by default' if a creative-industry path would actually fit. Concerned about transportation, money management, and whether he can run his own creative work as a real income.",
  student_voice:
    "I want to do something with music or media. I'm not trying to sit in lectures for four years. I'd rather be in a studio, on a set, or building my own thing. I just need help with the boring parts — dates, forms, getting places on time.",
  family_voice:
    "We want Jordan to see that his creative work is a real career path, not just a hobby. We need help connecting him to working creatives, getting organized, and building the adulting skills that don't come naturally — driving, deadlines, money.",
  educator_input:
    "Jordan is one of the most engaging students I have when the work connects to something he cares about. He produced an outstanding final project in Media Literacy. Executive function is the consistent barrier — not ability. Strongly recommend dual-enrollment at Gateway's audio engineering program and a structured internship.",
  communication_prefs:
    "Text first, always. Won't read long emails. Will absolutely talk in person once trust is built — short check-ins beat formal meetings.",
  transportation_needs:
    "Needs structured driver's ed practice and a plan for city-bus familiarity. Could realistically be driving solo by senior year with support.",
  family_priorities:
    "Take his creative work seriously as a career · Build adulting skills (deadlines, money, driving) · Avoid 'community college by default' if a better-fit path exists.",
  family_concerns_extended:
    "Worried grades will close doors that his portfolio could open. Concerned about income stability in creative fields and whether he can self-manage freelance work.",
  student_worries:
    "Being underestimated. Getting stuck doing 'boring' work that doesn't lead anywhere. Letting his mom down if school grades stay low.",
  services_received:
    "Special education (SLD), executive-function coaching (1x/week), extended time on tests, preferential seating, organizational checklists with case manager.",
  desired_postsecondary_outcomes:
    "Audio-engineering certificate or apprenticeship by age 20 · Steady freelance / studio work by age 22 · Driver's license + own transportation by graduation.",
  upcoming_meetings:
    "Annual PPT — April 11, 2026 · Dual-enrollment intake at Gateway — May 2026 · Internship interview at Soundbar Studios — June 2026.",
};

export const JORDAN_REPORT: PathwayReport = {
  summary:
    "Jordan is a creative, hands-on 11th grader with real talent in music, video, and small-business thinking. He communicates with adults like a future colleague — what's slowing him down isn't ability, it's the executive-function and adulting scaffolding around the work. The right next 18 months focus on real creative-industry exposure plus very concrete organization, transportation, and self-advocacy reps.",

  strengths_snapshot: [
    "Creative voice in music and video that already moves people",
    "Confident verbal communicator with adults",
    "Hands-on builder who finishes projects he cares about",
    "Natural entrepreneur — already thinking about how creative work earns",
    "Connector — peers and adults trust him quickly",
  ],

  encouragement_to_student:
    "Jordan, your creative work is real, and the world is full of adults who'd want to talk to you about it. The boring parts — dates, forms, rides — aren't a sign anything's wrong with you. They're just the next skill to build, one rep at a time. We've got you.",

  student_snapshot: {
    grade_level: "11th grade · New Haven Academy",
    graduation_timeline: "On track for a standard diploma · Spring 2027",
    primary_interests: ["Music production", "Video editing & content", "Entrepreneurship", "Photography"],
    learning_preferences: [
      "Hands-on, project-based work over lectures",
      "Choice in how he demonstrates learning",
      "Visual deadlines (phone reminders he can actually see)",
      "1:1 conversation over whole-class participation",
    ],
    communication_style:
      "Strongest verbally — Jordan thinks out loud, tells a great story, and connects with adults quickly. Texts back fast; rarely responds to email. Won't raise his hand in front of peers but will linger after class to ask a real question.",
    current_transition_status:
      "Has produced creative work outside school for two years (beats, edits, a small T-shirt side hustle with cousins). Has not yet completed a formal internship, paid creative job, or vocational assessment. Holds a learner's permit but is not yet a confident independent driver.",
    readiness_level: "developing",
    family_priorities: [
      "Treat Jordan's creative work as a real career direction",
      "Build executive-function and adulting skills (deadlines, forms, money, driving)",
      "Connect him to working creatives early — not just teachers",
      "Protect his confidence while raising the bar on follow-through",
    ],
    student_voice_quote:
      "I want to do something with music or media. I just need help with the boring parts — dates, forms, getting places on time.",
  },

  spin_analysis: {
    strengths: [
      "Original creative voice (music, video)",
      "Verbal communication with adults",
      "Project follow-through on work he cares about",
      "Entrepreneurial instinct",
    ],
    preferences: [
      "Hands-on, studio-style work",
      "Visual reminders over written instructions",
      "1:1 mentorship over whole-class teaching",
      "Choice in how to show what he knows",
    ],
    interests: [
      "Music production (hip-hop, lo-fi)",
      "Short-form video editing",
      "Streetwear, sneakers, and resale",
      "Podcasting and photography",
    ],
    needs: [
      "External structure for deadlines and project steps",
      "Transportation independence",
      "Self-advocacy with teachers he doesn't yet trust",
      "Money management as creative income grows",
    ],
    motivators: [
      "Making work people actually see and hear",
      "Earning his own money from creative work",
      "Adults who treat his work like it's real",
    ],
    barriers: [
      "Executive-function gaps masked by humor",
      "Reluctance to ask for help in front of peers",
      "No consistent transportation independence",
    ],
    environmental_supports: [
      "Family who believes in the creative path",
      "Older sister who can model adulting skills",
      "Mr. Okafor (case manager) — already a trusted adult",
    ],
    areas_for_growth: [
      "Independent driving and transit use",
      "Self-advocacy with new teachers",
      "Tracking income and expenses from creative work",
    ],
    what_this_means:
      "Jordan's strengths and interests are already pulling in one direction — creative media and entrepreneurship. The unlock for the next year is real-world creative exposure (a studio, a working creative, a paid gig) PLUS very concrete adulting scaffolding (planner he opens, driving practice, a money tracker). Don't push him into a four-year academic path that ignores who he actually is.",
  },

  recommended_pathways: [
    {
      type: "best-fit",
      title: "Music & Audio Production",
      why_it_fits:
        "Jordan already produces beats outside school. A short, credentialed audio program plus a real studio mentor turns the hobby into income and identity within 18 months.",
      related_strengths: ["Original creative voice", "Project follow-through", "Verbal communication"],
      possible_barriers: ["Inconsistent transportation to studios", "Income is uneven early", "Solo work requires self-management"],
      supports_needed: [
        "Driving practice ramp + transit backup plan",
        "A working-producer mentor (not just a teacher)",
        "Weekly check-in on deadlines and money",
      ],
      school_experiences: [
        "Dual-enrollment in Gateway's Music & Sound Recording certificate",
        "Senior capstone tied to a real client EP or short film",
        "Media Literacy elective continued in 12th grade",
      ],
      community_experiences: [
        "Tour a working New Haven studio (Firehouse 12)",
        "Shadow a working producer for a half-day session",
        "Submit a track to a youth-music showcase",
      ],
      courses_or_programs: [
        "Gateway Community College — Music & Sound Recording Certificate",
        "Berklee Online intro audio engineering course",
        "Adobe Audition or Pro Tools intro tutorials",
      ],
      career_clusters: ["Arts, A/V Technology & Communications"],
      credentials: [
        "Portfolio of 8–10 finished tracks",
        "Gateway audio certificate",
        "Pro Tools 101 certification",
      ],
      partner_resources: [
        "Gateway Community College — Music program",
        "CT BRS Pre-ETS",
        "Local studio internship coordinators",
      ],
      action_steps: {
        thirty_day: [
          "Pick 5 favorite finished beats and bounce them into one portfolio folder",
          "Tour Gateway's Music & Sound Recording program",
          "Email one local producer to ask for a 20-minute conversation",
        ],
        ninety_day: [
          "Complete one beat for an outside client (peer artist, podcast intro)",
          "Apply for Pre-ETS through BRS",
          "Add 'audio engineering certificate' as a postsecondary option in IEP",
        ],
        six_month: [
          "Finish a 5-track EP or 1 short-film score",
          "Shadow a working producer for a half-day session",
          "Add the project + reflection to a transition portfolio",
        ],
        one_year: [
          "Enroll in one Gateway audio course as a dual-enrollment student",
          "Earn at least one paid creative gig",
          "Decide together: audio engineering certificate, A/V pathway, or hybrid creative-business path",
        ],
      },
    },
    {
      type: "exploration",
      title: "Video & Short-Form Content",
      why_it_fits:
        "Jordan already edits short videos for friends. The same skill stack — story sense, music, pacing — opens paid work in social-media content, real-estate videos, and brand collabs.",
      related_strengths: ["Hands-on builder", "Verbal storytelling", "Visual eye"],
      possible_barriers: ["Inconsistent income early", "Client work requires written communication"],
      supports_needed: ["A simple invoicing template", "Help responding to client emails", "Mentor to review work monthly"],
      school_experiences: [
        "Media Literacy elective senior year",
        "Senior capstone: a short documentary about a local creative",
        "Connect with the school's video production club as a leader",
      ],
      community_experiences: [
        "Volunteer to edit one community-org promo video",
        "Attend a New Haven youth-media event",
        "Tour Southern CT State's media arts facilities",
      ],
      courses_or_programs: [
        "Adobe Premiere / DaVinci Resolve intro tutorials",
        "Gateway A/V Technology certificate",
      ],
      career_clusters: ["Arts, A/V Technology & Communications", "Marketing"],
      credentials: ["Reel of 8–10 finished edits", "One paid client deliverable"],
      partner_resources: ["School video club advisor", "Local nonprofit comms director (intro by Mr. Okafor)"],
      action_steps: {
        thirty_day: [
          "Build a one-link portfolio site for video work",
          "Pick one community org and offer to edit a 60-second promo",
        ],
        ninety_day: [
          "Deliver the promo and capture a testimonial",
          "Add 1 paid edit to portfolio",
        ],
        six_month: [
          "Run one paid client project end-to-end (intake → invoice → delivery)",
        ],
        one_year: [
          "Decide whether video is a primary path, a paired skill with audio, or a stabilizing side income",
        ],
      },
    },
    {
      type: "stretch",
      title: "Creative Entrepreneurship",
      why_it_fits:
        "Jordan already thinks like a small-business owner (T-shirt side hustle with cousins). A structured young-entrepreneur program would turn instinct into skill.",
      related_strengths: ["Natural connector", "Verbal pitching", "Project follow-through"],
      possible_barriers: ["Running a business stacks on top of executive-function gaps", "Taxes and tracking are new"],
      supports_needed: ["Bookkeeping coach (monthly check-in)", "Mentor who runs a real creative small business"],
      school_experiences: ["Senior capstone tied to launching one real product", "Business elective if available"],
      community_experiences: [
        "Apply to a CT youth entrepreneurship program (e.g. Junior Achievement)",
        "Attend a New Haven small-business networking event with a trusted adult",
      ],
      courses_or_programs: ["Junior Achievement of Southwest New England", "Gateway intro business course"],
      career_clusters: ["Business Management & Administration", "Marketing"],
      credentials: ["Registered side business", "One closed sales cycle documented"],
      partner_resources: ["Junior Achievement", "Local SBDC (Small Business Development Center)"],
      action_steps: {
        thirty_day: ["Pick one product idea and one customer to test it with"],
        ninety_day: ["Make 5 real sales of that product and track them in a simple spreadsheet"],
        six_month: ["Decide whether the business idea grows or pauses"],
        one_year: ["Decide whether entrepreneurship is a primary path, a paired skill, or a long-term side path"],
      },
    },
  ],

  career_pathways: [
    {
      title: "Music & Audio Production",
      why_it_fits: "Already produces beats outside school; thrives in studio-style hands-on work.",
      example_roles: ["Audio engineer", "Music producer", "Podcast editor", "Live-sound technician"],
      first_steps: ["Tour Gateway's audio program", "Email one local producer for a 20-minute conversation", "Bounce a 5-track portfolio"],
    },
    {
      title: "Video & Short-Form Content",
      why_it_fits: "Already edits short videos for friends; strong story sense and pacing.",
      example_roles: ["Freelance video editor", "Social-media content creator", "Small-brand videographer"],
      first_steps: ["Edit a 60-second promo for one community org", "Build a one-link portfolio", "Add a paid testimonial"],
    },
  ],

  career_matches: [
    {
      cluster: "Audio Production",
      example_jobs: ["Audio engineer", "Music producer", "Podcast editor", "Live-sound tech"],
      skills_required: ["DAW fluency (Pro Tools, Logic, FL Studio)", "Mixing fundamentals", "Client communication", "Time management"],
      education_needed: "Audio engineering certificate (1 year) preferred over a 4-year degree; portfolio + credits matter most.",
      work_environment: "Studios, live venues, or home setup. Long sessions, irregular hours, mostly indoors.",
      accommodations: ["Project-based deadlines instead of timed tasks", "Written brief from clients", "Mentor check-in weekly", "Phone-calendar deadline reminders"],
      readiness_level: "developing",
      next_step: "Tour Gateway's Music & Sound Recording program and email one working producer for a conversation.",
    },
    {
      cluster: "Video & Digital Media",
      example_jobs: ["Freelance video editor", "Social-media content creator", "Real-estate videographer", "Brand content assistant"],
      skills_required: ["Premiere or DaVinci Resolve", "Story and pacing sense", "Client communication", "Invoicing"],
      education_needed: "Portfolio first. Optional A/V certificate at Gateway.",
      work_environment: "Mostly independent, mix of on-location shoots and editing at home. Flexible hours.",
      accommodations: ["Written briefs over verbal", "Templated invoices and emails", "Mentor monthly review"],
      readiness_level: "emerging",
      next_step: "Offer to edit one 60-second promo for a community org and capture a testimonial.",
    },
    {
      cluster: "Creative Entrepreneurship",
      example_jobs: ["Streetwear / merch micro-brand", "Beat-licensing micro-business", "Creator-services side business"],
      skills_required: ["Pitching", "Basic bookkeeping", "Customer follow-through", "Pricing"],
      education_needed: "Junior Achievement or Gateway business intro; mentorship matters more than degree.",
      work_environment: "Self-directed, mostly from home. Requires showing up to client conversations.",
      accommodations: ["Bookkeeping coach (monthly)", "Templated customer responses", "Written goals reviewed weekly"],
      readiness_level: "emerging",
      next_step: "Pick one product and make 5 real sales tracked in a simple spreadsheet.",
    },
  ],

  readiness_scorecard: [
    {
      category: "Self-advocacy",
      level: "emerging",
      evidence: "Talks easily with trusted adults but rarely asks new teachers for help — covers confusion with humor.",
      what_it_means: "Jordan can advocate one-on-one. Next step is doing it before falling behind, not after.",
      growth_activity: "Pre-week check-in with each teacher on Mondays to confirm what's due.",
      suggested_goal: "Jordan will independently request clarification from at least one new teacher per week in 4 of 5 weeks.",
    },
    {
      category: "Executive function / organization",
      level: "emerging",
      evidence: "Strong work submitted late; loses paper handouts; phone calendar exists but isn't used.",
      what_it_means: "This is the single highest-leverage skill for graduation and any creative career.",
      growth_activity: "Daily 5-minute end-of-day planner review with case manager or family.",
      suggested_goal: "Jordan will use a phone-calendar planner to track 90% of assignments across all classes for 8 consecutive weeks.",
    },
    {
      category: "Career awareness",
      level: "developing",
      evidence: "Has named two specific career directions (audio, video) and produced real work outside school.",
      what_it_means: "Has real direction. Next step is one working-creative conversation and one credentialed program.",
      growth_activity: "Complete one informational interview with a working producer or editor.",
      suggested_goal: "By June, Jordan will complete 1 informational interview and 1 program tour in an area of creative interest.",
    },
    {
      category: "Independent travel",
      level: "emerging",
      evidence: "Has a learner's permit; rarely drives independently; hasn't taken the bus alone.",
      what_it_means: "Without transportation, internships and creative gigs are blocked.",
      growth_activity: "One driving session per week with family + one bus ride with a trusted adult by month's end.",
      suggested_goal: "Jordan will independently drive to school 3 days per week or complete 2 solo bus trips per month by end of 12th grade.",
    },
    {
      category: "Financial literacy",
      level: "emerging",
      evidence: "Earns small amounts from side hustles; no system for tracking income or expenses.",
      what_it_means: "Creative work compounds when income is tracked; falls apart when it isn't.",
      growth_activity: "Track every $ in and out from creative work in a single Google Sheet for 4 weeks.",
      suggested_goal: "Jordan will maintain a weekly income/expense log for creative work for 12 consecutive weeks.",
    },
    {
      category: "Communication with adults",
      level: "progressing",
      evidence: "Comfortable in 1:1 conversation with adults he trusts; avoids email and group settings.",
      what_it_means: "Strong relational foundation — needs to extend to email and unfamiliar adults.",
      growth_activity: "Send one professional email per week (to a teacher, mentor, or potential client).",
      suggested_goal: "Jordan will send at least 1 professional email per week for 8 consecutive weeks with no more than 1 prompt.",
    },
  ],

  postsecondary_goals: [
    {
      area: "Education / Training",
      current_status:
        "On track for a standard diploma in 2027. Not interested in a traditional 4-year college path. Open to a credentialed creative-industry program.",
      suggested_direction:
        "Pursue an audio engineering or A/V certificate at Gateway Community College, with one course taken as dual-enrollment in 12th grade.",
      why_it_matters:
        "A short, credentialed program aligned to his strengths is more likely to be completed and more career-relevant than a generalist 4-year degree.",
      measurable_goal_language:
        "After completing high school, Jordan will enroll in at least one credit-bearing course at Gateway Community College in an area of creative interest within 12 months of graduation.",
      next_steps: [
        "Tour Gateway's Music & Sound Recording program",
        "Meet with Gateway disability services to understand supports",
        "Complete one dual-enrollment course in 12th grade",
      ],
      who_supports: ["Family", "Mr. Okafor (case manager)", "Gateway disability services"],
      evidence_needed: ["Campus visit reflection", "Disability services intake completed"],
    },
    {
      area: "Employment",
      current_status:
        "Produces creative work outside school and runs a small T-shirt side hustle with cousins. No formal paid employment or internship yet.",
      suggested_direction:
        "Build a creative-industry work ladder: 1 informational interview → 1 community-org video edit → 1 paid creative gig → supported summer internship via BRS.",
      why_it_matters:
        "Real creative work experience before graduation predicts career outcomes more than any single course or assessment.",
      measurable_goal_language:
        "After completing high school, Jordan will be employed or contracted in a creative role (audio, video, or content) for at least 10 hours per week.",
      next_steps: [
        "Apply for CT BRS Pre-Employment Transition Services this spring",
        "Complete one informational interview with a working creative",
        "Land one paid creative gig before end of 12th grade",
      ],
      who_supports: ["BRS counselor", "Mr. Okafor", "Family", "Creative mentor"],
      evidence_needed: ["BRS application submitted", "Informational interview reflection", "Paid invoice or contract"],
    },
    {
      area: "Independent Living",
      current_status:
        "Lives at home, manages personal routine, helps with cousins' side hustle. Has not lived away from family or managed his own bills.",
      suggested_direction:
        "Build adulting reps: one bill on autopay he reviews monthly, one solo grocery trip per week, one overnight away before graduation.",
      why_it_matters:
        "Creative work especially needs adulting discipline — independence has to grow alongside income.",
      measurable_goal_language:
        "After completing high school, Jordan will live in a setting of his choice with at least 3 demonstrated independent-living skills (transportation, money management, meal planning).",
      next_steps: [
        "Take over one household bill review per month",
        "Plan, shop for, and prepare one meal per week",
        "Spend one overnight away from home before graduation",
      ],
      who_supports: ["Family", "Older sister (peer modeling)", "Case manager"],
      evidence_needed: ["Bill-review log", "Weekly meal log", "Overnight reflection"],
    },
    {
      area: "Community Participation & Transportation",
      current_status:
        "Has a learner's permit but inconsistent driving practice. Hasn't taken the city bus alone. Family currently drives him everywhere.",
      suggested_direction:
        "Two parallel tracks: weekly driving practice + first solo bus trips. Either path gets him to internships.",
      why_it_matters:
        "Without transportation, every creative opportunity is filtered through family schedules. This is the highest-leverage unlock in the next 12 months.",
      measurable_goal_language:
        "Before graduation, Jordan will independently drive to school OR independently complete 2 solo bus trips per month to community destinations.",
      next_steps: [
        "Schedule one driving session per week with family",
        "Take one CT Transit bus trip with a trusted adult by month's end",
        "Add 'transportation independence' goal to spring IEP",
      ],
      who_supports: ["Family", "Older sister", "Case manager"],
      evidence_needed: ["Driving log", "Solo trip log", "Transportation IEP goal added"],
    },
  ],

  iep_translator: [
    {
      goal_text:
        "Jordan will improve work completion by submitting 80% of assignments on time across all classes.",
      plain_meaning:
        "Jordan will turn in 4 out of every 5 assignments by the day they're due, in every class — not just the ones he loves.",
      connected_services: ["Case management check-ins", "Resource room organization support", "Phone-calendar coaching"],
      questions_to_ask: [
        "Who is tracking the submission rate weekly?",
        "What's the support if he drops below 80% in any single class?",
        "Does 'on time' include same-day late, or only by the due date/time?",
      ],
      what_student_should_know:
        "This isn't about being a different kind of student. It's about a system — a calendar you actually open — so your strong work gets seen on time.",
      connected_to_real_life:
        "Every creative gig has a deadline. Studios, clients, and labels all run on 'turn it in by Friday'. This skill IS the career.",
      missing_information: ["Who reviews the weekly tracker with him?", "What teachers count toward the 80%?"],
    },
    {
      goal_text:
        "Jordan will identify 2 postsecondary pathways aligned to his creative interests by the end of 11th grade.",
      plain_meaning:
        "By June, Jordan should be able to name two specific programs or career directions in creative media that he's seriously considering, and explain why each fits.",
      connected_services: ["BRS Pre-ETS", "Transition coordinator support", "Career interest inventory"],
      questions_to_ask: [
        "Who arranges the program tours and informational interviews?",
        "Can dual-enrollment at Gateway count toward this goal?",
      ],
      what_student_should_know:
        "You're not picking your whole life. You're picking two real directions worth a closer look this year.",
      connected_to_real_life:
        "Every working creative we'll introduce you to picked a direction the same way — try it, decide, adjust.",
      missing_information: ["Target dates for program tours", "Backup pathways if first choices don't fit"],
    },
  ],

  data_gaps: [
    {
      item: "Current vocational assessment results",
      why_it_matters: "Recommendations are currently based on family/school observation only.",
      who_can_help: "School psychologist or transition coordinator",
      how_to_collect: "Request a vocational assessment at the next PPT.",
      question_to_ask: "Has Jordan had a formal vocational assessment in the last 2 years?",
    },
    {
      item: "CT BRS / Pre-ETS eligibility status",
      why_it_matters: "BRS Pre-Employment Transition Services unlock paid creative-industry internships and skill-building.",
      who_can_help: "Case manager and a local BRS counselor",
      how_to_collect: "Request a referral letter at the next PPT and call the New Haven BRS office.",
      question_to_ask: "Has Jordan been referred to BRS yet? If not, can we start that process this month?",
    },
    {
      item: "Dual-enrollment eligibility at Gateway Community College",
      why_it_matters: "A dual-enrollment audio or A/V course in 12th grade would build credits, confidence, and college familiarity.",
      who_can_help: "School counselor and Gateway's dual-enrollment office",
      how_to_collect: "Ask the school counselor for the current dual-enrollment process and deadlines.",
      question_to_ask: "Can we plan one dual-enrollment course at Gateway for senior year?",
    },
  ],

  student_voice_prompts: [
    { prompt: "What kind of work would I want to be doing every day?", suggested_reflection: "Think studio, set, computer, or face-to-face." },
    { prompt: "Who is one working creative I'd want to talk to for 20 minutes?", suggested_reflection: "Producer, editor, designer, small business owner. One person." },
    { prompt: "What's one boring adulting skill I'd like to crack this year?", suggested_reflection: "Driving, money tracking, on-time submission — pick one." },
    { prompt: "If I could be paid for one creative thing this year, what would it be?", suggested_reflection: "Beat, edit, photo, design, merch — pick something real." },
    { prompt: "What do I need adults to stop doing for me?", suggested_reflection: "Independence starts with someone else stepping back." },
  ],

  family_action_plan: {
    this_week: [
      "Read this report together at the kitchen table",
      "Set up Jordan's phone calendar with his class deadlines",
      "Text Mr. Okafor to request the next PPT meeting",
    ],
    this_month: [
      "Tour Gateway's Music & Sound Recording program",
      "Submit a BRS Pre-ETS referral request",
      "Start a simple income/expense sheet for creative work",
    ],
    before_next_meeting: [
      "Print this report and the Meeting Prep section",
      "Write down 3 questions in Jordan's own words",
      "Decide together which 2 goals matter most this year",
    ],
    this_school_year: [
      "Complete 1 informational interview with a working creative",
      "Edit 1 promo video for a community org",
      "Schedule weekly driving practice",
    ],
    before_graduation: [
      "Submit a Gateway dual-enrollment application",
      "Complete 1 paid creative gig",
      "Add a transportation-independence goal to senior-year IEP",
    ],
  },

  teacher_action_plan: {
    goal_updates: [
      "Tighten work-completion goal with weekly check-in protocol",
      "Add postsecondary-exploration goal tied to 2 program tours",
      "Add executive-function support in IEP accommodations",
    ],
    progress_monitoring: [
      "Weekly assignment-submission tracker reviewed with Jordan",
      "Monthly check-in on creative portfolio progress",
    ],
    assessments_to_run: [
      "Updated vocational interest inventory",
      "Executive-function screener (BRIEF-2 or equivalent)",
    ],
    classroom_activities: [
      "Project-based options whenever an essay is assigned (audio/video accepted)",
      "Pre-week deadline review every Monday in resource room",
    ],
    family_communication: [
      "Share this report with family before next PPT",
      "Schedule a 20-minute pre-PPT phone call",
    ],
    student_conference_questions: [
      "Which class deadline feels hardest to track? Why?",
      "Who's one working creative you'd want to meet?",
      "What's one adult-skill you actually want help with?",
    ],
    service_connections: [
      "Initiate BRS Pre-ETS referral",
      "Connect with Gateway dual-enrollment coordinator",
    ],
    accommodations: [
      "Extended time and chunked deadlines on long projects",
      "Choice in mode of demonstration (audio/video accepted in place of written)",
      "Phone-calendar use permitted as planner",
    ],
    work_based_learning: [
      "Coordinate 1 informational interview with a local creative",
      "Pair Jordan with the video production club as a leader",
    ],
  },

  meeting_prep_toolkit: {
    questions_to_ask: [
      "Has Jordan been referred to BRS for Pre-ETS?",
      "Can we add a dual-enrollment course at Gateway for senior year?",
      "Can we add an executive-function support and a transportation goal?",
      "What's the plan for measuring work-completion weekly?",
      "Which teachers will accept audio/video deliverables in place of essays?",
    ],
    documents_to_bring: [
      "This Pathway Report",
      "Most recent IEP and progress reports",
      "Sample of Jordan's best creative work (link to 1 beat + 1 edit)",
      "Current grades broken down by class",
    ],
    concerns_to_raise: [
      "Strong work submitted late is hiding Jordan's actual ability",
      "No paid or formal work experience yet",
      "Transportation independence has not been addressed",
    ],
    strengths_to_highlight: [
      "Original creative work already produced outside school",
      "Strong verbal communication with trusted adults",
      "Clear, specific postsecondary direction",
      "Family fully engaged in the plan",
    ],
    goals_to_review: [
      "Work-completion goal (tighten measurement)",
      "Postsecondary-pathways goal (add 2 specific program tours)",
      "Add transportation-independence goal",
    ],
    services_to_discuss: [
      "BRS Pre-ETS",
      "Gateway dual-enrollment",
      "Executive-function coaching",
      "Travel training or driving practice plan",
    ],
    student_voice_prompts: [
      "Ask Jordan which goal feels most important to him",
      "Ask Jordan which creative project he wants the team to know about",
    ],
    follow_up_items: [
      "Confirm BRS referral within 2 weeks",
      "Schedule the Gateway tour",
      "Share updated IEP draft with family before signing",
    ],
  },

  opportunity_matches: [
    {
      category: "Program tour",
      name: "Gateway Community College — Music & Sound Recording",
      why_it_fits: "Credentialed audio program directly aligned to Jordan's strongest creative skill.",
      what_student_gains: "Sees what a real audio program looks like; meets faculty; tests college fit on his terms.",
      readiness_level: "developing",
      how_to_explore: "Schedule a tour through Gateway's admissions office; ask for disability services to join.",
      who_helps: "Family schedules; Mr. Okafor supports follow-up.",
    },
    {
      category: "Informational interview",
      name: "Half-hour with a working New Haven producer",
      why_it_fits: "Lets Jordan see and hear what the actual career path looks like from someone doing it.",
      what_student_gains: "A real conversation, a possible future contact, and a confidence boost.",
      readiness_level: "developing",
      how_to_explore: "Mr. Okafor or family can reach out to local studios for an intro.",
      who_helps: "Case manager and family.",
    },
    {
      category: "Service / agency",
      name: "CT Bureau of Rehabilitation Services (BRS) — Pre-ETS",
      why_it_fits: "Free pre-employment services for students with disabilities, including paid creative-industry internships.",
      what_student_gains: "Access to job coaches, paid summer placements, and skill-building funding.",
      readiness_level: "developing",
      how_to_explore: "Request a referral letter at the next PPT meeting.",
      who_helps: "Case manager initiates; family completes application.",
    },
    {
      category: "First paid gig",
      name: "Edit one 60-second promo for a community org",
      why_it_fits: "A real, low-pressure client deliverable that builds portfolio, testimonial, and confidence.",
      what_student_gains: "First paid (or pro bono) credit, a testimonial, and a story to tell at the next interview.",
      readiness_level: "emerging",
      how_to_explore: "Identify one local nonprofit and offer to edit a 60-second promo this month.",
      who_helps: "Family identifies the org; Mr. Okafor reviews the deliverable.",
    },
  ],

  progress_timeline: [
    {
      stage: "Self-awareness",
      status: "complete",
      description: "Jordan can name his interests, his executive-function challenges, and at least one trusted adult.",
      milestones: ["Named 2 specific creative paths", "Identified Mr. Okafor as a trusted adult"],
    },
    {
      stage: "Career exploration",
      status: "in-progress",
      description: "Real-world creative-industry exposure starting with one program tour and one informational interview.",
      milestones: ["Gateway program tour", "1 informational interview with a working creative"],
      suggested_deadline: "Spring 2026",
    },
    {
      stage: "Work-based learning",
      status: "upcoming",
      description: "First paid or pro bono creative deliverable, then a supported summer internship.",
      milestones: ["1 community-org video edit", "1 paid creative gig"],
      suggested_deadline: "End of 11th grade",
    },
    {
      stage: "Independent travel",
      status: "upcoming",
      description: "Driving independence + first solo transit trips so internships aren't blocked by transportation.",
      milestones: ["3 days/week driving to school", "2 solo bus trips per month"],
      suggested_deadline: "End of 12th grade",
    },
    {
      stage: "Adult-services & college connection",
      status: "future",
      description: "BRS adult case opened; Gateway dual-enrollment course completed.",
      milestones: ["BRS adult case open", "1 dual-enrollment course completed"],
      suggested_deadline: "12th grade",
    },
    {
      stage: "Adult life transition",
      status: "future",
      description: "Credentialed creative-industry work; semi-independent living plan in motion.",
      milestones: ["10+ hrs/week creative work", "Audio or A/V certificate enrolled", "Living arrangement decision"],
      suggested_deadline: "By age 22",
    },
  ],

  confidence_level: "moderate",
  needs_human_review: [
    "Confirm current BRS / Pre-ETS eligibility with Mr. Okafor",
    "Validate Gateway dual-enrollment timeline with the school counselor",
    "Verify Gateway disability-services intake process before scheduling a visit",
  ],

  education_training_options: [
    "Gateway Community College — Music & Sound Recording Certificate",
    "Gateway A/V Technology certificate",
    "Berklee Online intro audio engineering course",
    "Junior Achievement of Southwest New England — youth entrepreneurship",
    "Adobe Premiere / Pro Tools online intro tutorials",
  ],

  life_skills_focus: [
    "Daily phone-calendar planner use across all classes",
    "Weekly driving practice (working toward solo school commute)",
    "Tracking creative-work income and expenses in one sheet",
    "Sending one professional email per week",
    "Self-advocating to a new teacher before falling behind",
  ],

  family_questions_for_ppt: [
    "Has Jordan been referred to BRS for Pre-Employment Transition Services?",
    "Can we add a Gateway dual-enrollment course for senior year?",
    "Can we add a transportation-independence goal to spring IEP?",
    "How will we measure work-completion weekly across all classes?",
    "Which teachers will accept audio/video deliverables in place of essays?",
  ],

  teacher_next_steps: [
    "Submit BRS Pre-ETS referral within 2 weeks",
    "Coordinate 1 informational interview before end of spring semester",
    "Tighten work-completion goal with weekly tracker",
    "Begin Gateway dual-enrollment conversation with counselor",
    "Add transportation-independence goal to senior IEP",
  ],

  thirty_day_plan: [
    { week: 1, action: "Set up Jordan's phone calendar with every class deadline and read this report together." },
    { week: 2, action: "Email Mr. Okafor to request a PPT meeting and a BRS Pre-ETS referral." },
    { week: 3, action: "Tour Gateway's Music & Sound Recording program and meet disability services." },
    { week: 4, action: "Bring this report, Jordan's questions, and a link to his best beat to the PPT meeting." },
  ],
};

/* ---------- Bundle + helper ---------- */

export type DemoStudentId = "maya" | "jordan";

export const DEMO_STUDENTS = {
  maya: {
    id: "maya" as const,
    profile: DEMO_STUDENT,
    intake: DEMO_INTAKE,
    report: DEMO_REPORT,
    reportId: "TF-DEMO-2026-0001",
    issued: "March 4, 2026",
    headline: "Calm, hands-on, ready for animal-care work",
    tagline: "11th grader · autism + ADHD · East Hartford, CT",
    nextMeetingDate: "April 8, 2026 · 3:30 PM",
  },
  jordan: {
    id: "jordan" as const,
    profile: JORDAN_STUDENT,
    intake: JORDAN_INTAKE,
    report: JORDAN_REPORT,
    reportId: "TF-DEMO-2026-0002",
    issued: "March 6, 2026",
    headline: "Creative, verbal, ready for the studio",
    tagline: "11th grader · SLD + ADHD · New Haven, CT",
    nextMeetingDate: "April 11, 2026 · 4:00 PM",
  },
};

export function getDemoStudent(id?: string | null) {
  return id === "jordan" ? DEMO_STUDENTS.jordan : DEMO_STUDENTS.maya;
}

export type DemoStudentBundle = ReturnType<typeof getDemoStudent>;
