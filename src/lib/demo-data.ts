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
