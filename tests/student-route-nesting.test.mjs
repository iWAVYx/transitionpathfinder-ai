import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const studentDirectory = read("src/routes/_authenticated/students.index.tsx");
const studentDetail = read("src/routes/_authenticated/students.$studentId.tsx");
const routeTree = read("src/routeTree.gen.ts");

test("the student directory and detail page are sibling authenticated routes", () => {
  assert.match(
    studentDirectory,
    /createFileRoute\("\/_authenticated\/students\/"\)/,
    "the student directory must remain the /students index route",
  );
  assert.match(
    studentDetail,
    /createFileRoute\("\/_authenticated\/students\/\$studentId"\)/,
    "the student detail page must keep its dynamic route",
  );

  assert.match(
    routeTree,
    /const AuthenticatedStudentsIndexRoute =[\s\S]*?getParentRoute: \(\) => AuthenticatedRoute,/,
    "the generated directory route must be parented directly by the authenticated shell",
  );
  assert.match(
    routeTree,
    /const AuthenticatedStudentsStudentIdRoute =[\s\S]*?getParentRoute: \(\) => AuthenticatedRoute,/,
    "the generated detail route must be a sibling of the directory route",
  );
  assert.doesNotMatch(
    routeTree,
    /getParentRoute: \(\) => AuthenticatedStudentsRoute/,
    "the directory page must never become a layout that hides the detail page",
  );
});

test("the student directory still links through the normal student-detail workflow", () => {
  assert.match(studentDirectory, /to="\/students\/\$studentId"/);
  assert.match(studentDirectory, /params=\{\{ studentId: s\.id \}\}/);
  assert.match(studentDetail, /data-testid="student-document-section"/);
});
