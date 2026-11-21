import { expect, it } from "vitest";
import {
  nextActionContextSchema,
  personalActionToolSearch,
} from "@/lib/next-actions/action-context";
const student = "11111111-1111-4111-8111-111111111111";
it.each(["student", "family", "educator", "partner"])(
  "preserves %s and the selected student",
  (role) => {
    expect(personalActionToolSearch(role, student)).toEqual({ role, student_id: student });
    expect(nextActionContextSchema.parse(personalActionToolSearch(role, student))).toEqual({
      role,
      student_id: student,
    });
    expect(personalActionToolSearch(role)).toEqual({ role });
  },
);
it.each(["school_admin", "district_admin", "admin", "unknown"])(
  "does not substitute a personal context for %s",
  (role) => {
    expect(personalActionToolSearch(role, student)).toBeUndefined();
  },
);
it.each([
  { role: "admin" },
  { role: "family", student_id: "invalid" },
  { role: ["family", "student"] },
])("rejects malformed context without broadening it: %j", (value) => {
  expect(() => nextActionContextSchema.parse(value)).toThrow();
});
it("keeps direct links compatible and strips unrelated search values", () => {
  expect(nextActionContextSchema.parse({})).toEqual({});
  expect(nextActionContextSchema.parse({ role: "family", redirect: "/owner" })).toEqual({
    role: "family",
  });
});
