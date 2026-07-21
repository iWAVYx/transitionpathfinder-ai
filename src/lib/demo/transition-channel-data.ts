/**
 * Demo Transition Channel — fictional data for the public demo.
 *
 * All identifiers are fictional (prefixed `demo-`). Nothing here reads from
 * the live `channels`, `channel_messages`, or `channel_members` tables and
 * nothing here mutates a real database. Interactivity is layered on top by
 * `use-demo-channels.ts`, which mutates an isolated in-memory store.
 *
 * The bundle exported here is keyed by (role, contextId) so switching the
 * demo student / school / district / partner-plan loads the matching
 * conversation set — every role sees a different, plausible slice.
 */
import type { DemoRoleId } from "@/lib/demo/role-previews";
import type { DemoProfileId } from "@/lib/demo/demo-profiles";
import type {
  SchoolProfileId,
  DistrictProfileId,
  PartnerPlanId,
} from "@/lib/demo/role-contexts";

export type DemoChannelKind =
  | "student_team"
  | "student_family"
  | "school_team"
  | "district_impl"
  | "partner_relationship"
  | "opportunity_referral"
  | "partner_internal"
  | "platform_support";

export type DemoChannelMessage = {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: string; // ISO
  body: string;
  pinned?: boolean;
  actionItem?: { assignee: string; due?: string; done?: boolean };
  mentions?: string[];
  attachment?: { name: string; kind: "pdf" | "image" | "doc"; sizeKb: number };
};

export type DemoChannel = {
  id: string;
  kind: DemoChannelKind;
  title: string;
  purpose: string;
  members: { id: string; name: string; role: string }[];
  messages: DemoChannelMessage[];
  unread: number;
  muted: boolean;
  archived?: boolean;
  lastActivityLabel: string;
};

export type DemoConnectionRequest = {
  id: string;
  from: { name: string; org: string; role: string };
  purpose: string;
  proposedChannelTitle: string;
  status: "incoming" | "outgoing" | "accepted" | "declined";
};

export type DemoChannelBundle = {
  contextId: string;
  contextLabel: string;
  channels: DemoChannel[];
  connectionRequests: DemoConnectionRequest[];
};

/** Context id chosen from the applicable per-role selector. */
export type DemoChannelContextId =
  | DemoProfileId // student / family / educator
  | SchoolProfileId // school-admin
  | DistrictProfileId // district-admin
  | PartnerPlanId; // partner

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const now = Date.now();
const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();

function mkChannel(c: Omit<DemoChannel, "unread" | "muted" | "lastActivityLabel"> & {
  unread?: number;
  muted?: boolean;
  lastActivityLabel?: string;
}): DemoChannel {
  const last = c.messages[c.messages.length - 1];
  return {
    unread: c.unread ?? 0,
    muted: c.muted ?? false,
    lastActivityLabel: c.lastActivityLabel ?? (last ? relativeLabel(last.createdAt) : "No activity"),
    ...c,
  } as DemoChannel;
}

export function relativeLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Per-role bundles                                                   */
/* ------------------------------------------------------------------ */

function studentFamilyBundle(profileId: DemoProfileId, kind: "student" | "family"): DemoChannelBundle {
  const name = profileId === "jordan" ? "Jordan Rivera" : profileId === "riley" ? "Riley Chen" : "Sam Alvarez";
  const grade = profileId === "jordan" ? "G11" : profileId === "riley" ? "G9" : "G7";
  const partnerOrg = profileId === "sam" ? "STEM Middle Bridge" : "Manchester CC Access Center";

  const teamCh = mkChannel({
    id: `demo-team-${profileId}`,
    kind: "student_team",
    title: `${name}'s Transition Team`,
    purpose: `Coordinate ${name}'s transition plan across family, educators, and support staff.`,
    members: [
      { id: "u-student", name, role: "Student" },
      { id: "u-parent", name: "Maria (Parent)", role: "Parent/Guardian" },
      { id: "u-cm", name: "Ms. Alvarez", role: "Case Manager" },
      { id: "u-couns", name: "Mr. Patel", role: "Counselor" },
    ],
    messages: [
      { id: "m1", channelId: `demo-team-${profileId}`, authorId: "u-cm", authorName: "Ms. Alvarez", authorRole: "Case Manager", createdAt: iso(180), body: `Draft agenda for ${name}'s next PPT is ready — please review before Friday.`, pinned: true },
      { id: "m2", channelId: `demo-team-${profileId}`, authorId: "u-parent", authorName: "Maria (Parent)", authorRole: "Parent", createdAt: iso(90), body: "Thanks — we'd like to add a question about transportation to the tour." },
      { id: "m3", channelId: `demo-team-${profileId}`, authorId: "u-couns", authorName: "Mr. Patel", authorRole: "Counselor", createdAt: iso(35), body: `Uploaded ${name}'s latest career-interest inventory.`, attachment: { name: `${name.split(" ")[0]}-CareerInterest.pdf`, kind: "pdf", sizeKb: 214 } },
    ],
    unread: 2,
  });

  const oppCh = mkChannel({
    id: `demo-opp-${profileId}`,
    kind: "opportunity_referral",
    title: `Referral · ${partnerOrg}`,
    purpose: "Follow-up on the matched community opportunity.",
    members: [
      { id: "u-parent", name: "Maria (Parent)", role: "Parent/Guardian" },
      { id: "u-cm", name: "Ms. Alvarez", role: "Case Manager" },
      { id: "u-partner", name: `${partnerOrg} Coordinator`, role: "Partner" },
    ],
    messages: [
      { id: "o1", channelId: `demo-opp-${profileId}`, authorId: "u-partner", authorName: `${partnerOrg} Coordinator`, authorRole: "Partner", createdAt: iso(1440), body: `We can host a tour the second week of the month. Interested?` },
      { id: "o2", channelId: `demo-opp-${profileId}`, authorId: "u-cm", authorName: "Ms. Alvarez", authorRole: "Case Manager", createdAt: iso(120), body: "Family confirmed — I'll add it to the calendar.", actionItem: { assignee: "Ms. Alvarez", due: "This Fri", done: false } },
    ],
    unread: kind === "family" ? 1 : 0,
  });

  const familyCh = mkChannel({
    id: `demo-family-${profileId}`,
    kind: "student_family",
    title: `Family & School · ${name}`,
    purpose: "Direct family ↔ school conversation about services, consent, and logistics.",
    members: [
      { id: "u-parent", name: "Maria (Parent)", role: "Parent/Guardian" },
      { id: "u-cm", name: "Ms. Alvarez", role: "Case Manager" },
    ],
    messages: [
      { id: "f1", channelId: `demo-family-${profileId}`, authorId: "u-cm", authorName: "Ms. Alvarez", authorRole: "Case Manager", createdAt: iso(60 * 26), body: "Consent form for the community-based work sample is ready to sign in your Documents." },
      { id: "f2", channelId: `demo-family-${profileId}`, authorId: "u-parent", authorName: "Maria (Parent)", authorRole: "Parent", createdAt: iso(45), body: "Reviewing tonight — will send back tomorrow.", actionItem: { assignee: "Maria (Parent)", due: "Tomorrow" } },
    ],
    unread: kind === "family" ? 1 : 0,
  });

  return {
    contextId: profileId,
    contextLabel: `${name} · ${grade}`,
    channels: [teamCh, familyCh, oppCh],
    connectionRequests: [
      {
        id: `cr-${profileId}-1`,
        from: { name: `${partnerOrg} Coordinator`, org: partnerOrg, role: "Partner" },
        purpose: `Share a summer program that matches ${name}'s interests`,
        proposedChannelTitle: `Referral · ${partnerOrg}`,
        status: "incoming",
      },
    ],
  };
}

function educatorBundle(profileId: DemoProfileId): DemoChannelBundle {
  const primary = studentFamilyBundle(profileId, "family");
  const secondName = profileId === "jordan" ? "Riley Chen" : "Jordan Rivera";
  const teamCh = mkChannel({
    id: `demo-edu-team-${profileId}`,
    kind: "school_team",
    title: "Transition Team · Hartford Regional",
    purpose: "Weekly caseload sync between case managers and counselors.",
    members: [
      { id: "u-cm", name: "Ms. Alvarez", role: "Case Manager" },
      { id: "u-couns", name: "Mr. Patel", role: "Counselor" },
      { id: "u-tvi", name: "Mx. Chen", role: "TVI" },
    ],
    messages: [
      { id: "et1", channelId: `demo-edu-team-${profileId}`, authorId: "u-couns", authorName: "Mr. Patel", authorRole: "Counselor", createdAt: iso(300), body: `${secondName}'s tour report is uploaded — talking points added to the meeting prep.` },
      { id: "et2", channelId: `demo-edu-team-${profileId}`, authorId: "u-cm", authorName: "Ms. Alvarez", authorRole: "Case Manager", createdAt: iso(28), body: "Referral response needed by tomorrow.", actionItem: { assignee: "You", due: "Tomorrow" }, mentions: ["You"] },
    ],
    unread: 1,
  });
  return {
    ...primary,
    channels: [teamCh, ...primary.channels],
    connectionRequests: [
      ...primary.connectionRequests,
      {
        id: `cr-edu-1`,
        from: { name: "Manchester CC Access Center", org: "Manchester CC", role: "Partner" },
        purpose: "Coordinate a dual-enrollment info session for the caseload",
        proposedChannelTitle: "Partner · Manchester CC Access",
        status: "incoming",
      },
    ],
  };
}

function schoolAdminBundle(schoolId: SchoolProfileId): DemoChannelBundle {
  const label = schoolId === "comprehensive" ? "Hartford Regional High" : "Northside Specialized Program";
  const chImpl = mkChannel({
    id: `demo-school-impl-${schoolId}`,
    kind: "school_team",
    title: `${label} · Implementation`,
    purpose: "Rollout, onboarding, and staff coverage.",
    members: [
      { id: "u-sa", name: "Dr. Nguyen", role: "School Admin" },
      { id: "u-cm", name: "Ms. Alvarez", role: "Case Manager" },
      { id: "u-couns", name: "Mr. Patel", role: "Counselor" },
    ],
    messages: [
      { id: "s1", channelId: `demo-school-impl-${schoolId}`, authorId: "u-sa", authorName: "Dr. Nguyen", authorRole: "School Admin", createdAt: iso(180), body: "Two new case managers still need onboarding — target by end of week.", pinned: true },
      { id: "s2", channelId: `demo-school-impl-${schoolId}`, authorId: "u-cm", authorName: "Ms. Alvarez", authorRole: "Case Manager", createdAt: iso(40), body: "Onboarding session scheduled Thursday 3pm." },
    ],
    unread: 1,
  });
  const chPartner = mkChannel({
    id: `demo-school-partner-${schoolId}`,
    kind: "partner_relationship",
    title: "Partner · Manchester CC Access",
    purpose: "Ongoing relationship with the dual-enrollment partner.",
    members: [
      { id: "u-sa", name: "Dr. Nguyen", role: "School Admin" },
      { id: "u-partner", name: "Manchester CC Coordinator", role: "Partner" },
    ],
    messages: [
      { id: "sp1", channelId: `demo-school-partner-${schoolId}`, authorId: "u-partner", authorName: "Manchester CC Coordinator", authorRole: "Partner", createdAt: iso(60 * 20), body: "Confirming spring cohort dates and the site-visit paperwork." },
    ],
  });
  return {
    contextId: schoolId,
    contextLabel: label,
    channels: [chImpl, chPartner],
    connectionRequests: [
      { id: "cr-school-1", from: { name: "District Coordinator", org: "Coastal Regional", role: "District" }, purpose: "Quarterly readiness check-in", proposedChannelTitle: "District ↔ School Sync", status: "incoming" },
    ],
  };
}

function districtBundle(districtId: DistrictProfileId): DemoChannelBundle {
  const label = districtId === "regional-network" ? "Coastal Regional Network" : "Bridgeport Local District";
  const chLead = mkChannel({
    id: `demo-district-lead-${districtId}`,
    kind: "district_impl",
    title: `${label} · School Leadership`,
    purpose: "Implementation cadence across schools.",
    members: [
      { id: "u-dc", name: "District Coordinator", role: "District Admin" },
      { id: "u-sa1", name: "Dr. Nguyen (Hartford Regional)", role: "School Admin" },
      { id: "u-sa2", name: "Ms. Ortiz (Northside)", role: "School Admin" },
    ],
    messages: [
      { id: "d1", channelId: `demo-district-lead-${districtId}`, authorId: "u-dc", authorName: "District Coordinator", authorRole: "District Admin", createdAt: iso(240), body: "Q3 readiness aggregate is up 6% — nice work. Two schools flagged for staffing support.", pinned: true },
      { id: "d2", channelId: `demo-district-lead-${districtId}`, authorId: "u-sa1", authorName: "Dr. Nguyen", authorRole: "School Admin", createdAt: iso(45), body: "Requesting one additional seat for a new case manager." },
    ],
    unread: 1,
  });
  const chLic = mkChannel({
    id: `demo-district-license-${districtId}`,
    kind: "platform_support",
    title: "License & Rollout",
    purpose: "Seats, invites, and rollout support with TransitionForward.",
    members: [
      { id: "u-dc", name: "District Coordinator", role: "District Admin" },
      { id: "u-tf", name: "TransitionForward Support", role: "Support" },
    ],
    messages: [
      { id: "dl1", channelId: `demo-district-license-${districtId}`, authorId: "u-tf", authorName: "TransitionForward Support", authorRole: "Support", createdAt: iso(60 * 10), body: "Seats added; access codes were issued to school admins." },
    ],
  });
  const chPartner = mkChannel({
    id: `demo-district-partner-${districtId}`,
    kind: "partner_relationship",
    title: "Regional Partner Outreach",
    purpose: "Community partners engaged at the district level.",
    members: [
      { id: "u-dc", name: "District Coordinator", role: "District Admin" },
      { id: "u-partner", name: "CT DDS Regional Liaison", role: "Partner" },
    ],
    messages: [
      { id: "dp1", channelId: `demo-district-partner-${districtId}`, authorId: "u-partner", authorName: "CT DDS Regional Liaison", authorRole: "Partner", createdAt: iso(60 * 30), body: "Sharing the updated adult-services intake window for graduating seniors." },
    ],
  });
  return {
    contextId: districtId,
    contextLabel: label,
    channels: [chLead, chLic, chPartner],
    connectionRequests: [
      { id: "cr-district-1", from: { name: "Statewide Workforce Board", org: "CT DOL", role: "Partner" }, purpose: "Pilot a summer-work registration flow", proposedChannelTitle: "Pilot · Summer Work Registration", status: "incoming" },
    ],
  };
}

function partnerBundle(planId: PartnerPlanId): DemoChannelBundle {
  const isPremium = planId === "premium";
  const chInternal = mkChannel({
    id: `demo-partner-internal-${planId}`,
    kind: "partner_internal",
    title: "Manchester CC · Access Team",
    purpose: "Internal coordination for outreach and cohort planning.",
    members: [
      { id: "u-pl", name: "Partner Lead", role: "Partner" },
      { id: "u-pc", name: "Program Coordinator", role: "Partner" },
    ],
    messages: [
      { id: "pi1", channelId: `demo-partner-internal-${planId}`, authorId: "u-pl", authorName: "Partner Lead", authorRole: "Partner", createdAt: iso(300), body: "Spring cohort capacity finalized — 14 seats across two site visits." },
      { id: "pi2", channelId: `demo-partner-internal-${planId}`, authorId: "u-pc", authorName: "Program Coordinator", authorRole: "Partner", createdAt: iso(30), body: "Awaiting three district responses; will follow up Thursday.", actionItem: { assignee: "Program Coordinator", due: "Thu" } },
    ],
    unread: 1,
  });
  const chSchool = mkChannel({
    id: `demo-partner-school-${planId}`,
    kind: "partner_relationship",
    title: "Hartford Regional · Partnership",
    purpose: "Relationship channel with the school admin.",
    members: [
      { id: "u-pl", name: "Partner Lead", role: "Partner" },
      { id: "u-sa", name: "Dr. Nguyen", role: "School Admin" },
    ],
    messages: [
      { id: "ps1", channelId: `demo-partner-school-${planId}`, authorId: "u-sa", authorName: "Dr. Nguyen", authorRole: "School Admin", createdAt: iso(60 * 12), body: "Confirming site-visit dates and the paperwork for our families." },
    ],
  });
  const chOpp = mkChannel({
    id: `demo-partner-opp-${planId}`,
    kind: "opportunity_referral",
    title: "Referrals · Anonymous Matches",
    purpose: "Matched interest — no student PII. Introductions require family opt-in.",
    members: [
      { id: "u-pl", name: "Partner Lead", role: "Partner" },
    ],
    messages: [
      { id: "po1", channelId: `demo-partner-opp-${planId}`, authorId: "u-pl", authorName: "System", authorRole: "System", createdAt: iso(200), body: isPremium ? "12 matched families expressed interest this week (premium analytics)." : "3 matched families expressed interest (upgrade for engagement analytics)." },
    ],
  });
  return {
    contextId: planId,
    contextLabel: isPremium ? "Manchester CC · Premium" : "Manchester CC · Free",
    channels: [chInternal, chSchool, chOpp],
    connectionRequests: [
      { id: `cr-partner-${planId}-1`, from: { name: "Northside Specialized Program", org: "Hartford PS", role: "School Admin" }, purpose: "Explore a cohort partnership", proposedChannelTitle: "Northside · Partnership", status: "incoming" },
      { id: `cr-partner-${planId}-2`, from: { name: "Family of prospective student", org: "Opt-in intro", role: "Family" }, purpose: "Introduction opt-in from a matched family", proposedChannelTitle: "Family Intro (opt-in)", status: isPremium ? "incoming" : "outgoing" },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Public resolver                                                    */
/* ------------------------------------------------------------------ */

export function getDemoChannelBundle(
  role: DemoRoleId,
  contextId: string,
): DemoChannelBundle {
  switch (role) {
    case "student":
      return studentFamilyBundle((contextId as DemoProfileId) ?? "jordan", "student");
    case "family":
      return studentFamilyBundle((contextId as DemoProfileId) ?? "jordan", "family");
    case "educator":
      return educatorBundle((contextId as DemoProfileId) ?? "jordan");
    case "school-admin":
      return schoolAdminBundle((contextId as SchoolProfileId) ?? "comprehensive");
    case "district-admin":
      return districtBundle((contextId as DistrictProfileId) ?? "regional-network");
    case "partner":
      return partnerBundle((contextId as PartnerPlanId) ?? "free");
  }
}

export function roleTileCopy(role: DemoRoleId): { title: string; description: string } {
  return {
    title: "Transition Channel",
    description:
      "Communicate, coordinate next steps, and keep important transition conversations connected.",
  };
}
