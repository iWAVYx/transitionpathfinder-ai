import { describe, expect, it } from "vitest";
import { filterUsefulItems, snippetHash } from "@/lib/report-evidence/extract.functions";

describe("evidence extraction helpers", () => {
  describe("snippetHash", () => {
    it("is stable for whitespace and case variants", () => {
      const a = snippetHash("student_voice", "document", "abc", "Loves working with dogs.");
      const b = snippetHash("student_voice", "document", "abc", "  loves working with dogs.  ");
      const c = snippetHash("student_voice", "document", "abc", "LOVES\tworking  with dogs.");
      expect(a).toBe(b);
      expect(a).toBe(c);
    });

    it("changes when section, source, or snippet changes", () => {
      const base = snippetHash("student_voice", "document", "abc", "Loves dogs.");
      expect(snippetHash("readiness", "document", "abc", "Loves dogs.")).not.toBe(base);
      expect(snippetHash("student_voice", "note", "abc", "Loves dogs.")).not.toBe(base);
      expect(snippetHash("student_voice", "document", "xyz", "Loves dogs.")).not.toBe(base);
      expect(snippetHash("student_voice", "document", "abc", "Loves cats.")).not.toBe(base);
    });

    it("treats missing source id and empty string identically", () => {
      const a = snippetHash("readiness", "note", null, "Needs bus training.");
      const b = snippetHash("readiness", "note", undefined, "Needs bus training.");
      expect(a).toBe(b);
    });
  });

  describe("filterUsefulItems", () => {
    it("drops short, generic, and duplicate snippets", () => {
      const out = filterUsefulItems([
        { section: "student_voice", snippet: "short", confidence: "high" },
        { section: "student_voice", snippet: "N/A", confidence: "low" },
        { section: "student_voice", snippet: "Student needs support with self-advocacy.", confidence: "medium" },
        { section: "student_voice", snippet: "student needs support with self-advocacy.", confidence: "low" },
        { section: "readiness", snippet: "Uses public transit independently on weekends.", confidence: "high" },
      ]);
      expect(out.map((i) => i.snippet)).toEqual([
        "Student needs support with self-advocacy.",
        "Uses public transit independently on weekends.",
      ]);
    });
  });
});
