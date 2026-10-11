import { expect, it } from "vitest";
import { toTitleCase } from "../../src/lib/title-case";
it("preserves supplied acronyms inside compound document headings", () => {
  expect(toTitleCase("CT services — Pre-ETS and IEP/PPT support")).toBe("CT Services — Pre-ETS and IEP/PPT Support");
  expect(toTitleCase("post-secondary planning and family/student actions")).toBe("Post-Secondary Planning and Family/Student Actions");
});
