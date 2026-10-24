import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

test("oversized constrained collections reject before accumulating invalid-element issues", () => {
  const schema = z.array(z.string()).max(10);
  const input = Array(100_000).fill(42);
  const result = schema.safeParse(input);
  assert.equal(result.success, false);
  assert.equal(result.error.issues.length, 1);
  assert.equal(result.error.issues[0].code, "too_big");
  assert.equal(input.length, 100_000);
});

test("bounded validation retains valid values and rejects invalid values within the bound", () => {
  const schema = z.array(z.string().trim().min(1)).max(10);
  assert.deepEqual(schema.parse([" Planning ", "Goals"]), ["Planning", "Goals"]);
  assert.equal(schema.safeParse(["", 42]).success, false);
});
