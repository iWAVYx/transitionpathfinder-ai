import type { DashboardSnapshot } from "@/lib/golden-path.functions";

type PreviewDetails = { details: Array<{ label: string; value: string }>; nextStep: string };

/** Uses only the already-authorized snapshot; never fetches or invents preview data. */
export function studentToolPreviewDetails(
  path: string,
  snapshot: DashboardSnapshot,
): PreviewDetails {
  const student = snapshot.student;
  const meeting = snapshot.upcomingMeeting;
  if (path.startsWith("/students") || path === "/student-voice")
    return {
      details: [
        {
          label: "Strengths",
          value: student?.strengths_summary || "Strengths have not been added yet.",
        },
        {
          label: "Interests",
          value: student?.interests_summary || "Interests have not been added yet.",
        },
        {
          label: "Student voice",
          value: student?.student_voice_statement || "The student has not shared a statement yet.",
        },
      ],
      nextStep:
        "Review the student’s strengths and interests, then add their own priorities before planning the next step.",
    };
  if (/^\/(reports|pathway)/.test(path))
    return {
      details: [
        {
          label: "Family priorities",
          value: student?.family_priorities || "No family priorities have been saved yet.",
        },
        {
          label: "Planning context",
          value: student?.current_transition_status || "Transition status has not been added yet.",
        },
        {
          label: "Available inputs",
          value: `${snapshot.goals.length} goals and ${snapshot.documents.length} documents are available in this student’s workspace.`,
        },
      ],
      nextStep: snapshot.latestReport
        ? "Open the report, review its recommendations with the student, and choose a next action."
        : "Open the builder to bring together student voice, family priorities, and supporting information for the first report.",
    };
  if (/calendar|meetings|ppt-prep/.test(path))
    return {
      details: [
        { label: "Next meeting", value: meeting?.title || "No meeting is scheduled yet." },
        { label: "Location", value: meeting?.location || "No location has been set." },
        {
          label: "Preparation",
          value: `${snapshot.meetingPrep.filter((item) => !item.completed).length} saved preparation items still need attention.`,
        },
      ],
      nextStep:
        "Open meeting preparation to gather your questions and priorities, or use the calendar to review the schedule.",
    };
  if (path.includes("documents"))
    return {
      details: snapshot.documents
        .slice(0, 3)
        .map((doc) => ({ label: doc.title, value: doc.status.replaceAll("_", " ") })),
      nextStep: snapshot.documents.length
        ? "Review the listed files and their processing status in Documents before using them as evidence."
        : "Add the current IEP or another supporting document, review privacy choices, then check its processing status.",
    };
  if (path.includes("resources"))
    return {
      details: snapshot.recommendedResources
        .slice(0, 3)
        .map((resource) => ({ label: resource.title, value: resource.matched_reason })),
      nextStep:
        "Open a recommended resource to review why it fits, then save the useful ones for your plan.",
    };
  if (path.includes("action-items"))
    return {
      details: [
        {
          label: "Progress",
          value: `${snapshot.actionItems.filter((item) => item.status !== "complete").length} open items; ${snapshot.actionItems.filter((item) => item.status === "complete").length} completed.`,
        },
      ],
      nextStep:
        "Review the open items, choose the next task, and update its owner, timing, or progress in the full tool.",
    };
  if (path.includes("goals"))
    return {
      details: snapshot.goals
        .slice(0, 3)
        .map((goal) => ({ label: goal.title, value: goal.status })),
      nextStep:
        "Review each goal with the student and use the goal tracker to record progress and evidence.",
    };
  const steps: Record<string, string> = {
    "/family/consent":
      "Review each permission before granting or revoking it. Changes apply only to this student’s authorized workspace.",
    "/family/invites":
      "Review current team access, then invite a teammate or adjust an existing membership from the student team tool.",
    "/partner-network":
      "Compare services against the student’s interests and support needs, then save relevant matches to discuss with the team.",
    "/transition-channel":
      "Open the channel to read team conversations and follow up in the appropriate student context.",
  };
  return {
    details: [],
    nextStep:
      steps[path] ?? "Open the tool to review the current information and choose a next step.",
  };
}
