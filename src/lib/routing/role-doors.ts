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

export type RoleDoorSlug = "student" | "family" | "educator" | "school" | "district" | "partner";

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
  hash?: string;
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
  description: "Already have an account? Sign in to your workspace.",
  to: "/login",
};

const REDEEM_INVITATION: RoleDoorAction = {
  key: "redeem_invitation",
  label: "Redeem An Invitation",
  description: "Use the invitation link sent by your school, district, or organization.",
  to: "/login",
};

const REDEEM_ACCESS_CODE: RoleDoorAction = {
  key: "redeem_access_code",
  label: "Redeem An Access Code",
  description: "Enter a district or school-issued access code to create your individual account.",
  to: "/login",
  search: { redirect: "/redeem-access" },
};

const JOIN_WAITLIST = (role: RoleDoorSlug): RoleDoorAction => ({
  key: "join_waitlist",
  label: "Join The Waitlist",
  description: "Tell us where you are and we'll notify you as access opens in your area.",
  to: "/waitlist",
  search: { role },
});

const REQUEST_HELP = (
  label: string,
  description: string,
  topic: "family-question" | "educator-question" | "district-demo",
): RoleDoorAction => ({
  key: "request_org_access",
  label,
  description,
  to: "/help",
  search: { topic },
  hash: "contact",
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
        ...REQUEST_HELP(
          "Ask Your School To Add You",
          "Send a school-access request for your case manager or school counselor.",
          "family-question",
        ),
      },
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
      REQUEST_HELP(
        "Request Access Through Your School",
        "Ask your child's school or district to enable TransitionForward for your family.",
        "family-question",
      ),
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
      REQUEST_HELP(
        "Request Access Through Your District",
        "If your school or district already licenses TransitionForward, ask us to route your access request to its administrator.",
        "educator-question",
      ),
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
        description: "Talk with our team about piloting TransitionForward across your building.",
        to: "/help",
        search: { topic: "district-demo" },
        hash: "contact",
      },
      JOIN_WAITLIST("school"),
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
        to: "/help",
        search: { topic: "district-demo" },
        hash: "contact",
      },
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
        description: "Create a partner profile and appear in the Partner Network at no cost.",
        to: "/partner-interest",
      },
      {
        key: "partner_premium",
        label: "Begin Partner Premium",
        description:
          "Upgrade for enhanced discovery, warm-handoff intake, and matching diagnostics.",
        to: "/partner-interest",
      },
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
