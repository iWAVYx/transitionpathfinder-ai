import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const alignmentMigration = readFileSync(
  "supabase/migrations/20260823100000_align_public_resources_select_policies.sql",
  "utf8",
);
const publicPolicyMigration = readFileSync(
  "supabase/migrations/20260624192831_b7ee2ac5-441f-4cd1-b987-f958d629863c.sql",
  "utf8",
);

test("anonymous resources reads retain a public-only policy without authenticated helpers", () => {
  assert.match(
    publicPolicyMigration,
    /CREATE POLICY "Public reads published resources"[\s\S]*?TO anon, authenticated[\s\S]*?published_status IN \('published', 'featured', 'approved'\)/,
  );

  assert.match(
    alignmentMigration,
    /DROP POLICY IF EXISTS "Anyone reads verified resources" ON public\.resources/,
  );
  assert.match(
    alignmentMigration,
    /CREATE POLICY "Authenticated reads verified resources"[\s\S]*?TO authenticated[\s\S]*?public\.has_role\(auth\.uid\(\), 'admin'::app_role\)/,
  );
  assert.doesNotMatch(alignmentMigration, /TO anon\b/);
  assert.doesNotMatch(
    alignmentMigration,
    /DROP POLICY IF EXISTS "Public reads published resources"/,
  );
});
