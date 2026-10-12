import { expect, it } from "vitest";
import { goalTrackerItems } from "@/lib/goal-tracker-items";
it("preserves source wording and stable progress identity across reordering/insertion", async () => {
  const a = await goalTrackerItems({ life_skills_focus: ["Plan travel", "Ask for help"] });
  const b = await goalTrackerItems({ life_skills_focus: ["New step", "Ask for help", "Plan travel"] });
  expect(b[1]).toEqual(a[1]); expect(b[2]).toEqual(a[0]); expect(a[0].label).toBe("Plan travel");
  expect(a[0].id.length).toBeLessThan(200);
});
it("changed text or planning context cannot inherit another step's identity", async () => {
  const a = await goalTrackerItems({ life_skills_focus: ["Plan travel"], career_pathways: [{title:"Training",first_steps:["Plan travel"]}], thirty_day_plan:[{week:1,action:"Plan travel"}] });
  const b = await goalTrackerItems({ life_skills_focus:["Plan travel independently"],career_pathways:[{title:"Employment",first_steps:["Plan travel"]}],thirty_day_plan:[{week:2,action:"Plan travel"}] });
  expect(new Set([...a,...b].map(item => item.id)).size).toBe(6);
});
it("retains repeated source steps with unique deterministic IDs", async () => {
  const source = { life_skills_focus: ["Ask for help", "Ask for help"] };
  const items = await goalTrackerItems(source); expect(items).toHaveLength(2);
  expect(items[0].id).not.toBe(items[1].id); expect(await goalTrackerItems(source)).toEqual(items);
});
it("newer reports do not substitute retained legacy steps or another role plan", async () => {
  expect(await goalTrackerItems({schema_version:2,life_skills_focus:["Outdated legacy step"]})).toEqual([]);
  expect(await goalTrackerItems({schema_version:2,student_action_plan:{horizons:{thirty_day:["Different source"],ninety_day:["Later"],six_month:["Later"],one_year:["Later"]}}})).toEqual([]);
});
it.each([null, "invalid", {life_skills_focus:[42]}, {career_pathways:[{}]}, {thirty_day_plan:[{week:1}]}])("malformed steps are a recoverable error rather than fabricated progress: %j", async source => {
  await expect(goalTrackerItems(source)).rejects.toThrow("Report steps are unavailable.");
});

it("tracks complete current recommendations and all shared periods without retained legacy fallback", async () => {
  const rec = { title:"Training",summary:"Recorded summary",why:"Recorded reason",sources:[{kind:"profile",label:"Student profile"}],next_action:"Ask about training",owner_role:"family",discuss_at_next_meeting:true };
  const source = { schema_version:2, life_skills_focus:["Outdated legacy step"], postsecondary_education_recs:[rec], employment_pathway_recs:[{...rec,title:"Work",next_action:"Ask about work"}], independent_living_recs:[{...rec,title:"Living",next_action:"Practice travel"}],community_participation_recs:[{...rec,title:"Community",next_action:"Visit the club"}],cross_cutting_horizons:{thirty_day:["30-day action"],ninety_day:["90-day action"],six_month:["6-month action"],one_year:["Year action"]} };
  const items = await goalTrackerItems(source);
  expect(items.map(item => item.label)).toEqual(["Ask about training","Ask about work","Practice travel","Visit the club","30-day action","90-day action","6-month action","Year action"]);
  expect(items.map(item => item.group)).toContain("Next year");
  const reordered = await goalTrackerItems({...source,postsecondary_education_recs:[{...rec,title:"New option"},rec]});
  expect(reordered[1].id).toBe(items[0].id);
});
it("invalid current recommendations fail rather than falling back to older steps", async () => {
  await expect(goalTrackerItems({schema_version:2,life_skills_focus:["Old"],postsecondary_education_recs:[{title:"Incomplete"}]})).rejects.toThrow();
});
