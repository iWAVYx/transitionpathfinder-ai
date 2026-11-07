import { expect, it } from "vitest";
import { z } from "zod";
import { pathwayCreationFailure, readPathwayCreationFailure, parsePathwayCreationFailureMetadata } from "../../src/lib/pathway-creation-failure";

it("survives the framework's message-only Error transport without carrying private provider output", () => {
  let cause: unknown;
  try { z.object({ thirty_day_plan: z.array(z.string()).length(4) }).parse({thirty_day_plan:["PRIVATE STUDENT VALUE"]}); }
  catch(error) { cause=error; }
  const source = Object.assign(new Error("PRIVATE MODEL OUTPUT"), { name:"AI_NoObjectGeneratedError", cause, text:"PRIVATE BODY", response:{headers:{authorization:"PRIVATE KEY"}} });
  const error = pathwayCreationFailure("generation",source);
  const transported = new Error(error.message);
  expect(readPathwayCreationFailure(transported)).toEqual({stage:"validation",finishReason:"unknown",sections:["thirty_day_plan"],validationCodes:["too_small"]});
  expect(error.message).not.toMatch(/PRIVATE|authorization|headers|stack|response/);
});
it.each([402,429,503])("preserves structured provider status %s without reading its message/body", statusCode => {
  const result=readPathwayCreationFailure(pathwayCreationFailure("generation",Object.assign(new Error("PRIVATE"),{statusCode})));
  expect(result).toMatchObject({stage:"generation",statusCode,sections:[],validationCodes:[]});
});
it.each(["intake_save","report_save"] as const)("distinguishes %s and discards database message/detail/hint", stage => {
  const error=pathwayCreationFailure(stage,{code:"42501",message:"PRIVATE STUDENT",details:"PRIVATE SQL",hint:"PRIVATE KEY"});
  expect(readPathwayCreationFailure(new Error(error.message))).toMatchObject({stage,databaseCode:"42501"});
  expect(error.message).not.toContain("PRIVATE");
});
it("rejects arbitrary, extra, oversized or tampered metadata rather than exposing it", () => {
  const safe={stage:"validation",finishReason:"unknown",sections:["thirty_day_plan"],validationCodes:["too_small"]};
  expect(parsePathwayCreationFailureMetadata(safe)).toEqual(safe);
  for(const bad of [{...safe,student:"PRIVATE"},{...safe,sections:["PRIVATE"]},{...safe,validationCodes:["PRIVATE"]},{...safe,statusCode:200},{...safe,databaseCode:"PRIVATE SECRET"},{...safe,sections:Array(17).fill("summary")},{...safe,finishReason:"PRIVATE"}])
    expect(parsePathwayCreationFailureMetadata(bad)).toBeNull();
  const error=pathwayCreationFailure("generation",undefined);
  expect(readPathwayCreationFailure(new Error("PRIVATE"+error.message))).toBeNull();
  expect(readPathwayCreationFailure(new Error("x".repeat(4097)))).toBeNull();
  expect(readPathwayCreationFailure(new Error("unknown response"))).toBeNull();
});
it("handles circular errors and does not classify arbitrary names or message numbers as provider status", () => {
  const source:any={message:"429 PRIVATE",name:{},code:"PRIVATE"};source.cause=source;
  expect(readPathwayCreationFailure(pathwayCreationFailure("generation",source))).toEqual({stage:"generation",finishReason:"unknown",sections:[],validationCodes:[]});
  expect(readPathwayCreationFailure(pathwayCreationFailure("response_confirmation",source))?.stage).toBe("response_confirmation");
});
