import { expect, it } from "vitest";
import { calendarDayForInstant, shiftCalendarDay, validCalendarDay, validCalendarTimeZone } from "@/lib/calendar-day";
it("uses the viewer day across midnight and DST changes", () => {
  expect(calendarDayForInstant("2026-03-09T03:30:00Z", "America/New_York")).toBe("2026-03-08");
  expect(calendarDayForInstant("2026-11-02T04:30:00Z", "America/New_York")).toBe("2026-11-01");
  expect(calendarDayForInstant("2026-01-01T02:00:00Z", "America/Los_Angeles")).toBe("2025-12-31");
  expect(calendarDayForInstant("2026-01-01T02:00:00Z", "UTC")).toBe("2026-01-01");
});
it("subtracts calendar days without elapsed-hour drift across DST, leap and year boundaries", () => {
  expect(shiftCalendarDay("2026-03-08", -1)).toBe("2026-03-07");
  expect(shiftCalendarDay("2026-11-01", -1)).toBe("2026-10-31");
  expect(shiftCalendarDay("2028-03-01", -1)).toBe("2028-02-29");
  expect(shiftCalendarDay("2026-01-01", -14)).toBe("2025-12-18");
});
it("rejects invalid days and timezones rather than normalizing impossible dates", () => {
  expect(validCalendarDay("2026-02-30")).toBe(false); expect(validCalendarDay("2028-02-29")).toBe(true);
  expect(validCalendarDay("not-a-date")).toBe(false);
  expect(validCalendarTimeZone("America/New_York")).toBe(true); expect(validCalendarTimeZone("Not/AZone")).toBe(false);
});
