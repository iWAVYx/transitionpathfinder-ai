import { expect, it } from "vitest";
import { earlierGoalProgress } from "@/lib/earlier-goal-progress";
it("describes recognizable old positions without inventing original step wording", () => {
  expect(earlierGoalProgress({"life:0":"met","edu:2":"in-progress","path:1:3":"not-started","30d:4":"met"}).map(entry=>entry.label)).toEqual(["Earlier Life Skills Entry 1","Earlier Education Entry 3","Earlier Pathway 2, Step 4","Earlier Week 4 Entry"]);
});
it("does not offer opaque current IDs or malformed entries as recovery sources", () => {
  expect(earlierGoalProgress({"step-v1:hash:0":"met","unknown":"met","30d:99":"met","life:-1":"met","life:1":"invalid"} as any)).toEqual([]);
});
