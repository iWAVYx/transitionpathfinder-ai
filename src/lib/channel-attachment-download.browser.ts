/** Open only the HTTPS destination returned by the authenticated attachment endpoint. */
export function openChannelAttachment(url: string) {
  const destination = new URL(url);
  if (destination.protocol !== "https:") throw new Error("Attachment unavailable.");
  window.open(destination.href, "_blank", "noopener,noreferrer");
}
