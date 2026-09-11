import { redactSensitiveText } from "../sensitive-text-redaction.ts";

export const OWNER_AI_SMOKE_MODEL = "google/gemini-2.5-flash";

const SYNTHETIC_IEP_TEXT = [
  "Student name: Jordan Example",
  "Date of birth: 03/07/2010",
  "Student ID: TF-SMOKE-1001",
  "Guardian email: parent.smoke@example.invalid",
  "Guardian phone: (860) 555-0100",
  "Address: 100 Test Lane, Hartford, CT 06103",
  "School: Example Transition Academy",
  "Transition goal: The student will compare two supported employment programs and practice requesting workplace accommodations.",
].join("\n");

/**
 * Builds the fixed, privacy-safe input used by the owner-only live AI probe.
 * No user content is accepted. The raw synthetic identifiers are discarded
 * before the prompt leaves the server.
 */
export function buildOwnerAiSmokePrompt() {
  const privacySafe = redactSensitiveText(SYNTHETIC_IEP_TEXT, {
    studentFirstName: "Jordan",
    studentLastName: "Example",
    schoolName: "Example Transition Academy",
    dateOfBirth: "2010-03-07",
  });

  if (privacySafe.report.total < 7) {
    throw new Error("The synthetic privacy check did not redact every expected identifier.");
  }

  return {
    prompt: `You are running a TransitionForward infrastructure smoke test.

Read the privacy-safe, entirely fictional transition-planning text below. Return an object whose status is exactly "ok" only if the text contains a transition goal. Do not reproduce the text, identifiers, or redaction placeholders.

PRIVACY-SAFE SYNTHETIC TEXT:
"""
${privacySafe.text}
"""`,
    redactionCount: privacySafe.report.total,
  };
}
