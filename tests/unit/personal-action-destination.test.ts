import { expect, it } from "vitest";
import { personalActionDestination } from "@/lib/next-actions/personal-action-destination";
for (const role of ["student", "family", "educator"] as const)
  it(`links ${role} to the existing report reader`, () => {
    expect(personalActionDestination(role, "/reports/record#evidence")).toBe(
      "/reports/record#evidence",
    );
  });
for (const role of ["family", "educator"] as const)
  it(`allows the recorded meeting reader for ${role}`, () => {
    expect(personalActionDestination(role, "/meetings/record")).toBe("/meetings/record");
  });
for (const role of ["student", "partner"] as const)
  it(`does not send ${role} to meeting or Family tools`, () => {
    for (const route of ["/meetings/record", "/family/invites", "/documents", "/ppt-prep"])
      expect(personalActionDestination(role, route)).toBeUndefined();
  });
it("keeps Partner actions in real Partner tools", () => {
  expect(personalActionDestination("partner", "/partners-manage/opportunities")).toBe(
    "/partners-manage/opportunities",
  );
  expect(personalActionDestination("partner", "/reports/record")).toBeUndefined();
});
for (const route of [
  null,
  "",
  "/missing",
  "/owner",
  "/dashboard",
  "https://example.invalid",
  "//example.invalid",
  "/\\example.invalid",
  "/reports/a/b",
  "/meetings/%2Fbad",
  "/reports/../owner",
])
  it(`rejects unsupported or unsafe destination ${route}`, () => {
    expect(personalActionDestination("family", route)).toBeUndefined();
  });
it("does not carry arbitrary redirect query parameters into tools", () => {
  expect(
    personalActionDestination("family", "/reports?redirect=https://example.invalid#summary"),
  ).toBe("/reports#summary");
});
