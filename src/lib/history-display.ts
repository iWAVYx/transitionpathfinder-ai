import type { AuditEntry } from "./audit.functions";
export type HistoryFilterKey = "all" | "documents" | "sharing" | "meetings" | "plan";

export const HISTORY_FILTERS: { key: HistoryFilterKey; label: string }[] = [
  { key: "all", label: "Recent Activity" },
  { key: "documents", label: "Documents" },
  { key: "sharing", label: "Sharing & Consent" },
  { key: "meetings", label: "Meetings" },
  { key: "plan", label: "Plan & Goals" },
];

export function classifyEntry(entry: Pick<AuditEntry, "action" | "entity_type">): HistoryFilterKey {
  const t = (entry.entity_type || "").toLowerCase();
  const a = (entry.action || "").toLowerCase();
  if (
    t.includes("document") ||
    t.includes("upload") ||
    t.includes("storage") ||
    a.includes("download") ||
    a.includes("upload") ||
    a.includes("view_document")
  )
    return "documents";
  if (
    t.includes("permission") ||
    t.includes("share") ||
    t.includes("consent") ||
    t.includes("collaborator") ||
    t.includes("relationship") ||
    a.includes("grant") ||
    a.includes("revoke") ||
    a.includes("invite")
  )
    return "sharing";
  if (t.includes("meeting") || t.includes("agenda") || t.includes("ppt")) return "meetings";
  if (
    t.includes("goal") ||
    t.includes("plan") ||
    t.includes("pathway") ||
    t.includes("action_item") ||
    t.includes("student")
  )
    return "plan";
  return "all";
}

const knownActivityLabels = new Map([
  ["document.signed_url.mint", "Document Access Link Created"],
  ["document.signed_url.denied", "Document Access Link Denied"],
  ["document.upload", "Document Uploaded"],
  ["document.view", "Document Viewed"],
  ["document.download", "Document Downloaded"],
  ["document.permission.grant", "Document Sharing Granted"],
  ["document.permission.revoke", "Document Sharing Removed"],
  ["view_document", "Document Viewed"],
]);
export function humanizeAction(entry: Pick<AuditEntry, "action" | "entity_type">): string {
  const known = knownActivityLabels.get(entry.action.toLowerCase());
  if (known) return known;
  const a = entry.action.replace(/[_.]/g, " ").toLowerCase();
  const t = entry.entity_type.replace(/[_.]/g, " ").toLowerCase();
  return `${a.charAt(0).toUpperCase() + a.slice(1)}${t ? ` — ${t}` : ""}`;
}

export function actorLabel(entry: Pick<AuditEntry, "actor_email" | "actor_id">): string {
  if (entry.actor_email) return entry.actor_email;
  if (entry.actor_id) return "Team member";
  return "System";
}
