import { readFileSync } from "node:fs";
import ts from "typescript";
import { expect, it } from "vitest";

it("every product and retained hosted acceptance caller supplies explicit student context", () => {
  const callers = [
    ["src/lib/pathway.functions.ts", 2],
    ["tests/e2e/release-readiness/report-history-no-ai.signedin.spec.ts", 2],
    ["tests/e2e/release-readiness/linked-report-access-no-ai.signedin.spec.ts", 3],
  ] as const;
  for (const [path, expectedCalls] of callers) {
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
    let calls = 0;
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "writeReportContent") {
        calls++;
        expect(node.arguments.length, `${path}: explicit nullable context is required`).toBe(7);
        expect(node.arguments[6]?.getText(source)).not.toBe("undefined");
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(calls, `${path}: contract must inspect every known caller`).toBe(expectedCalls);
  }
});
