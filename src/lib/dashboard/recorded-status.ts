import type { DashboardSnapshot } from "@/lib/golden-path.functions";

/** Descriptive record state only; this never grants processing or sharing access. */
export function isCurrentConsentRecord(
  consent: DashboardSnapshot["consents"][number],
  now = Date.now(),
): boolean {
  if (consent.consent_status !== "granted" || consent.revoked_at || !Number.isFinite(now))
    return false;
  const granted = Date.parse(consent.granted_at);
  if (!Number.isFinite(granted) || granted > now) return false;
  if (consent.expires_at === null) return true;
  const expires = Date.parse(consent.expires_at);
  return Number.isFinite(expires) && expires > now;
}

/** No date, a past date or an invalid date cannot describe an upcoming meeting. */
export function upcomingRecordedMeeting(
  meeting: DashboardSnapshot["upcomingMeeting"],
  now = Date.now(),
): DashboardSnapshot["upcomingMeeting"] {
  if (!meeting?.scheduled_at || !Number.isFinite(now)) return null;
  const at = Date.parse(meeting.scheduled_at);
  return Number.isFinite(at) && at >= now ? meeting : null;
}
