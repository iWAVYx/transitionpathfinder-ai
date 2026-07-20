import { describe, expect, it } from "vitest";
import {
  STUDENT_TASK_KEYS,
  STUDENT_TASK_LABELS,
  STUDENT_TASK_RETURN_TO,
  isKnownStudentTaskKey,
  labelForStudentTask,
  returnToForStudentTask,
} from "@/lib/student-workflow/task-keys";

describe("Workstream 5 — student workflow task-key registry", () => {
  it("labels and return-to paths cover every registered task key", () => {
    for (const key of Object.values(STUDENT_TASK_KEYS)) {
      expect(STUDENT_TASK_LABELS[key]).toBeTruthy();
      expect(STUDENT_TASK_RETURN_TO[key]).toMatch(/^\//);
    }
  });

  it("registered return-to paths land on a signed-in student surface", () => {
    const allowed = new Set([
      "/student-voice",
      "/pathway/student",
      "/meetings",
      "/goals",
    ]);
    for (const path of Object.values(STUDENT_TASK_RETURN_TO)) {
      expect(allowed.has(path)).toBe(true);
    }
  });

  it("isKnownStudentTaskKey rejects unknown values but accepts registered ones", () => {
    expect(isKnownStudentTaskKey("student.voice")).toBe(true);
    expect(isKnownStudentTaskKey("attacker.injected")).toBe(false);
    expect(isKnownStudentTaskKey("")).toBe(false);
  });

  it("label + return-to helpers fall back safely for unknown keys", () => {
    expect(labelForStudentTask("student.voice")).toBe("Student Voice answers");
    expect(labelForStudentTask("unknown.key")).toBe("unknown.key");
    expect(returnToForStudentTask("student.goal.draft")).toBe("/goals");
    expect(returnToForStudentTask("unknown.key")).toBe("/dashboard");
    expect(returnToForStudentTask("unknown.key", "/somewhere")).toBe(
      "/somewhere",
    );
  });
});
