import { afterEach, expect, it, vi } from "vitest";
import { generateIntakeReport } from "../../src/lib/pathway-generation.server";
import { pathwayGenerationDiagnostics } from "../../src/lib/pathway-generation-diagnostics";

// Exercise the actual compatible provider + SDK parser. Every fetch is intercepted;
// there is no gateway, credential, database or model access in these tests.
const valid = {
  summary: "A fictional student is exploring culinary work.",
  strengths_snapshot: ["Reported practical interests", "Reported careful work"],
  career_pathways: ["Culinary", "Food service"].map(title => ({ title, why_it_fits: "An option to explore.", example_roles: ["Explore with the team"], first_steps: ["Ask about local options"] })),
  education_training_options: ["Discuss training", "Confirm entry requirements"],
  life_skills_focus: ["Ask for help", "Plan transport", "Practice routines"],
  family_questions_for_ppt: ["What was measured?", "Who can confirm?", "When can we review?"],
  teacher_next_steps: ["Confirm baseline", "Discuss criteria", "Agree review date"],
  thirty_day_plan: [1,2,3,4].map(week => ({ week, action: "Proposed: review with the team." })),
  encouragement_to_student: "Your interests help guide the next conversation.",
};
const input = { submitter_role: "family" as const, student_first_name: "Fictional", strengths: "Practical work", student_voice: "I want to explore cooking." };
function gateway(payload: unknown) {
  const calls: Array<{url:string;body:Record<string,any>}> = [];
  vi.stubGlobal("fetch", vi.fn(async (url: unknown, init?: RequestInit) => {
    const target = String(url);
    if (target !== "https://ai.gateway.lovable.dev/v1/chat/completions") throw Error("Unexpected offline test target");
    calls.push({url:target,body:JSON.parse(String(init?.body))});
    return new Response(JSON.stringify({ id:"offline", object:"chat.completion", created:1, model:"offline-model", choices:[{index:0,message:{role:"assistant",content:JSON.stringify(payload)},finish_reason:"stop"}], usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20} }), {status:200,headers:{"content-type":"application/json"}});
  }));
  return calls;
}
afterEach(() => vi.unstubAllGlobals());
it("validates an actual SDK JSON-object response when unsupported optional sections are omitted", async () => {
  const calls=gateway(valid);
  await expect(generateIntakeReport(input as any,"offline-not-a-key")).resolves.toEqual(valid);
  expect(calls).toHaveLength(1);
  expect(calls[0].body.response_format).toEqual({type:"json_object"});
  expect(calls[0].body.messages[0].content).toContain('"career_pathways"');
});
it("a 200 provider response can still fail report validation without an HTTP failure", async () => {
  const calls=gateway({...valid,thirty_day_plan:[{week:1,action:"Only one week"}]});
  const error=await generateIntakeReport(input as any,"offline-not-a-key").catch(e=>e);
  expect(error).toBeInstanceOf(Error);
  expect(calls).toHaveLength(1);
  expect(pathwayGenerationDiagnostics(error)).toMatchObject({sections:["thirty_day_plan"],validationCodes:["too_small"]});
});
it("does not turn null unsupported assessment blocks into a silently accepted report", async () => {
  const calls=gateway({...valid,student_snapshot:null});
  const error=await generateIntakeReport(input as any,"offline-not-a-key").catch(e=>e);
  expect(error).toBeInstanceOf(Error);
  expect(calls).toHaveLength(1);
  expect(pathwayGenerationDiagnostics(error).sections).toContain("student_snapshot");
});
