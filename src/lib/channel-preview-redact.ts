/**
 * Redaction for Transition Channel email/push previews.
 *
 * Digests and push notifications leave the app's authenticated surface,
 * so message previews MUST NOT contain identifiers that could leak PII
 * to a shared inbox, notification tray, or lock-screen. This helper
 * masks the common leakable patterns and clamps length. Callers should
 * pipe every raw message body through `redactChannelPreviewForEmail`
 * before writing it into a template.
 *
 * Requirement: T-04 (Beta Readiness ledger).
 */

const EMAIL_RE = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g;
// Phone: matches +1 (555) 123-4567, 555-123-4567, 5551234567, 555.123.4567
const PHONE_RE = /(?:\+?\d[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
// SSN-like: 3-2-4
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
// Bare long digit runs (student IDs, MRNs, DOBs mashed together): 7+ digits
const LONG_DIGITS_RE = /\b\d{7,}\b/g;
// Dates like 01/02/2007 or 2007-01-02 (DOB leak risk in previews)
const DATE_RE = /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
// URLs (signed-URL bodies can carry tokens)
const URL_RE = /https?:\/\/\S+/gi;

const MAX_LEN = 120;

export function redactChannelPreviewForEmail(input: string | null | undefined): string | undefined {
  if (!input) return undefined;
  let s = String(input).replace(/\s+/g, " ").trim();
  if (!s) return undefined;
  s = s
    .replace(URL_RE, "[link]")
    .replace(EMAIL_RE, "[email]")
    .replace(SSN_RE, "[redacted]")
    .replace(PHONE_RE, "[phone]")
    .replace(DATE_RE, "[date]")
    .replace(LONG_DIGITS_RE, "[redacted]");
  if (s.length > MAX_LEN) s = s.slice(0, MAX_LEN - 1).trimEnd() + "…";
  return s;
}
