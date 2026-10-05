import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { z } from "zod";
import { buildStructuredOutputSystem } from "../../src/lib/structured-output-system";

it("sends enums, optional sections and array bounds without source data", async () => {
  const schema = z.object({ role: z.enum(["family", "educator"]), optional: z.array(z.string()).min(1).max(3).optional() });
  const system = await buildStructuredOutputSystem(schema, "Keep the role-specific instructions.");
  expect(system).toContain("Keep the role-specific instructions.");
  const json = JSON.parse(system.split("\n").at(-1)!);
  expect(json.properties.role.enum).toEqual(["family", "educator"]);
  expect(json.properties.optional.minItems).toBe(1);
  expect(json.required).not.toContain("optional");
});

it("all structured AI consumers supply an explicit schema system prompt", () => {
  const files: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path); else if (path.endsWith(".ts")) files.push(path);
    }
  }
  walk("src/lib");
  let consumers = 0;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (!source.includes("Output.object({ schema:")) continue;
    consumers++;
    // Initial Pathway generation already sends its JSON schema explicitly.
    expect(source.includes("buildStructuredOutputSystem(") || (source.includes("zodSchema(ReportSchema)") && source.includes("JSON.stringify(reportJsonSchema)")), file).toBe(true);
  }
  expect(consumers).toBe(10);
});
