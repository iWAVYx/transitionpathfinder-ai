import { expect, it } from "vitest";
import { isCurrentConsentRecord, upcomingRecordedMeeting } from "@/lib/dashboard/recorded-status";
const NOW = Date.parse("2026-10-14T12:00:00Z");
const consent: any = {
  consent_status: "granted",
  granted_at: "2026-10-13T12:00:00Z",
  revoked_at: null,
  expires_at: null,
};
it("counts a granted unrevoked record with a valid effective grant date", () =>
  expect(isCurrentConsentRecord(consent, NOW)).toBe(true));
for (const changes of [
  { consent_status: "pending" },
  { consent_status: "revoked" },
  { revoked_at: "2026-10-13T12:00:00Z" },
  { revoked_at: "invalid" },
  { granted_at: "invalid" },
  { granted_at: "2026-10-14T12:00:00.001Z" },
  { expires_at: "invalid" },
  { expires_at: "2026-10-13T12:00:00Z" },
  { expires_at: "2026-10-14T12:00:00Z" },
])
  it(`does not count inactive or unverifiable consent ${JSON.stringify(changes)}`, () =>
    expect(isCurrentConsentRecord({ ...consent, ...changes }, NOW)).toBe(false));
it("handles exact grant and future expiry boundaries", () => {
  expect(
    isCurrentConsentRecord(
      { ...consent, granted_at: "2026-10-14T12:00:00Z", expires_at: "2026-10-14T12:00:00.001Z" },
      NOW,
    ),
  ).toBe(true);
});
it("uses absolute instants for timezone offsets", () => {
  expect(isCurrentConsentRecord({ ...consent, expires_at: "2026-10-14T07:00:00-05:00" }, NOW)).toBe(
    false,
  );
  expect(
    upcomingRecordedMeeting({ scheduled_at: "2026-10-14T08:00:00-05:00" } as any, NOW)
      ?.scheduled_at,
  ).toBe("2026-10-14T08:00:00-05:00");
});
for (const at of [null, "invalid", "2026-10-14T11:59:59.999Z"])
  it(`does not call meeting ${at} upcoming`, () =>
    expect(upcomingRecordedMeeting({ scheduled_at: at } as any, NOW)).toBeNull());
it("keeps a meeting at or after the observation boundary", () => {
  for (const at of ["2026-10-14T12:00:00Z", "2026-10-15T12:00:00Z"])
    expect(upcomingRecordedMeeting({ scheduled_at: at } as any, NOW)?.scheduled_at).toBe(at);
});
it("does not infer records from an invalid observation time", () => {
  expect(isCurrentConsentRecord(consent, NaN)).toBe(false);
  expect(upcomingRecordedMeeting({ scheduled_at: "2026-10-15T12:00:00Z" } as any, NaN)).toBeNull();
});
