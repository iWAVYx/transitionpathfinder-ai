/** Signed download destinations are supplied by the authenticated history endpoint. */
export function openHistoryAttachment(url: string) {
  const destination = new URL(url);
  if (destination.protocol !== "https:") throw new Error("Attachment unavailable.");
  window.location.assign(destination.href);
}
