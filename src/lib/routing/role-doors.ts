/**
 * Canonical Role Door registry.
 *
 * Workstream 3 — every public role entry point routes through
 * `/get-started/<role>`. Each door lists the applicable action set;
 * marketing pages, waitlist, invitations, and license requests are
 * reached through these actions rather than through ad-hoc links.
 *
 * Platform Owner is intentionally absent — there is no public signup.
 */

export type RoleDoorSlug =
  | "student"
  | "family"
  | "educator"
  | "school"
  | "district"
  | "partner";

export type RoleDoorActionKey =
  | "signin"
  | "redeem_invitation"
  | "redeem_access_code"
  | "request_org_access"
  | "join_waitlist"
  | "independent_signup"
  | "request_org_license"
  | "partner_free"
  | "partner_premium";

export interface RoleDoorAction {
  key: RoleDoorActionKey;
  label: string;
  description: string;
  to: string;
  search?: Record<string, string>;
}

export interface RoleDoor {
  slug: RoleDoorSlug;
  label: string;
  eyebrow: string;
  headline: string;
  intro: string;
  actions: RoleDoorAction[];
}

const SIGNIN: RoleDoorAction = {
  key: "signin",
  label: "Sign In",
  description:
    "Already have an account? Sign in to your workspace.",
  to: "/login",
};

const REDEEM_INVITATION: RoleDoorAction = {
  key: "redeem_invitation",
  label: "Redeem An Invitation",
  description:
    "Use the invitation link sent by your school, district, or organization.",
  to: "/login",
};

const REDEEM_ACCESS_CODE: RoleDoorAction = {
  key: "redeem_access_code",
  label: "Redeem An Access Code",
  description:
    "Enter a district or school-issued access code to create your individual account.",
  to: "/login",
};

const JOIN_WAITLIST = (role: RoleDoorSlug): RoleDoorAction => ({
  key: "join_waitlist",
  label: "Join The Waitlist",
  description:
    "Tell us where you are and we'll notify you as access opens in your area.",
  to: "/waitlist",
  search: { role },
});

export const ROLE_DOORS: Record<RoleDoorSlug, RoleDoor> = {
  student: {
    slug: "student",
    label: "Student",
    eyebrow: "For Students",
    headline: "Your Future, In Your Own Voice.",
    intro:
      "Explore careers, college, training, and life after high school — with a plan that reads like you, not paperwork.",
    actions: [
      SIGNIN,
      REDEEM_INVITATION,
      REDEEM_ACCESS_CODE,
      {
        key: "request_org_access",
        label: "Ask Your School To Add You",
        description:
          "Share TransitionForward with your case manager or school counselor.",
        to: "/waitlist",
        search: { role: "student" },
      },
      JOIN_WAITLIST("student"),
    ],
  },
  family: {
    slug: "family",
    label: "Family / Guardian",
    eyebrow: "For Families",
    headline: "Walk Into The Next Meeting Prepared.",
    intro:
      "Understand your child's plan, see what's next, and keep every document in one calm place.",
    actions: [
      SIGNIN,
      REDEEM_INVITATION,
      {
        key: "request_org_access",
        label: "Request Access Through Your School",
        description:
          "Ask your child's school or district to enable TransitionForward for your family.",
        to: "/waitlist",
        search: { role: "family" },
      },
      {
        key: "independent_signup",
        label: "Begin Independent Family Access",
        description:
          "For approved early-access families — start your child's transition plan today.",
        to: "/waitlist",
        search: { role: "family" },
      },
      JOIN_WAITLIST("family"),
    ],
  },
  educator: {
    slug: "educator",
    label: "Educator / Case Manager / Counselor",
    eyebrow: "For Educators",
    headline: "Organize Your Caseload Without Doubling Your Paperwork.",
    intro:
      "Special education teachers, case managers, school counselors, and transition coordinators — one workspace for goals, meetings, and next actions.",
    actions: [
      SIGNIN,
      REDEEM_INVITATION,
      REDEEM_ACCESS_CODE,
      {
        key: "request_org_access",
        label: "Request Access Through Your District",
        description:
          "If your school or district hasn't enabled TransitionForward yet, we'll route your request.",
        to: "/waitlist",
        search: { role: "educator" },
      },
      JOIN_WAITLIST("educator"),
    ],
  },
  school: {
    slug: "school",
    label: "School Leader",
    eyebrow: "For Schools",
    headline: "A Coordinated View Across Every Transition-Age Student.",
    intro:
      "Bring your special education team, counselors, and administration into one shared view of transition planning.",
    actions: [
      SIGNIN,
      {
        key: "request_org_license",
        label: "Request A School License",
        description:
          "Talk with our team about piloting TransitionForward across your building.",
        to: "/waitlist",
        search: { role: "district" },
      },
      JOIN_WAITLIST("district"),
    ],
  },
  district: {
    slug: "district",
    label: "District Leader",
    eyebrow: "For Districts",
    headline: "Transition Outcomes You Can See And Support.",
    intro:
      "Coordinate special education, counseling, and post-secondary planning across every building — with district-wide visibility and CT SEDS alignment.",
    actions: [
      SIGNIN,
      {
        key: "request_org_license",
        label: "Request A District License",
        description:
          "Start a conversation about district-wide provisioning, individual accounts, and secure roll-out.",
        to: "/waitlist",
        search: { role: "district" },
      },
      JOIN_WAITLIST("district"),
    ],
  },
  partner: {
    slug: "partner",
    label: "Community Partner",
    eyebrow: "For Partners",
    headline: "Connect With The Students You're Built To Serve.",
    intro:
      "Colleges, technical programs, BRS, employers, mentorship — join the network students and families actually see.",
    actions: [
      SIGNIN,
      {
        key: "partner_free",
        label: "Begin Partner Free",
        description:
          "Create a partner profile and appear in the Partner Network at no cost.",
        to: "/partners",
      },
      {
        key: "partner_premium",
        label: "Begin Partner Premium",
        description:
          "Upgrade for enhanced discovery, warm-handoff intake, and matching diagnostics.",
        to: "/partners",
      },
      JOIN_WAITLIST("partner"),
    ],
  },
};

export const ROLE_DOOR_SLUGS: RoleDoorSlug[] = [
  "student",
  "family",
  "educator",
  "school",
  "district",
  "partner",
];

export function isRoleDoorSlug(value: string): value is RoleDoorSlug {
  return (ROLE_DOOR_SLUGS as string[]).includes(value);
}

export function getRoleDoor(slug: RoleDoorSlug): RoleDoor {
  return ROLE_DOORS[slug];
}
