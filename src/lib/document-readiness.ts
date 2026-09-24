export interface DocumentReadinessItem {
  key: string;
  label: string;
  status: "complete" | "missing" | "in_review";
}

export const SAMPLE_DOCUMENT_READINESS: DocumentReadinessItem[] = [
  { key: "iep", label: "Current IEP", status: "complete" },
  { key: "eval", label: "Latest Evaluation", status: "complete" },
  { key: "consent", label: "Signed Release", status: "in_review" },
  { key: "transcript", label: "High-School Transcript", status: "missing" },
  { key: "voice", label: "Student Voice Summary", status: "complete" },
];

const LIVE_DOCUMENT_CATEGORIES: Array<{
  key: string;
  label: string;
  acceptedTypes: string[];
}> = [
  { key: "iep", label: "Current IEP", acceptedTypes: ["iep", "current-iep"] },
  { key: "evaluation", label: "Latest Evaluation", acceptedTypes: ["evaluation"] },
  { key: "transition-plan", label: "Transition Plan or SOP", acceptedTypes: ["transition-plan"] },
  { key: "progress-report", label: "Progress Report", acceptedTypes: ["progress-report"] },
  { key: "meeting-notes", label: "Meeting Notes", acceptedTypes: ["meeting-notes"] },
];

export function buildLiveDocumentReadiness(
  documents: Array<{ doc_type: string }>,
): DocumentReadinessItem[] {
  const presentTypes = new Set(
    documents.map((document) => document.doc_type.trim().toLowerCase().replaceAll("_", "-")),
  );

  return LIVE_DOCUMENT_CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    status: category.acceptedTypes.some((type) => presentTypes.has(type)) ? "complete" : "missing",
  }));
}
