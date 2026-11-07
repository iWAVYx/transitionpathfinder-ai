import { expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import {
  cleanupPptExact,
  pptExactAbsenceSql,
  type PptFixtureScope,
} from "../e2e/helpers/ppt-live-exact-cleanup";
const id = (n: number) => String(n).repeat(8) + "-1111-4111-8111-111111111111";
const f: PptFixtureScope = {
  ownerId: id(1),
  intakeId: id(2),
  reportId: id(3),
  prepId: id(4),
  marker: "QA PPT 12345-1 parent",
};
function setup(
  o: {
    duplicate?: boolean;
    wrongOwner?: boolean;
    error?: string;
    residual?: string;
    deleteError?: string;
    empty?: boolean;
  } = {},
) {
  const calls: Array<{ url: URL; method: string }> = [];
  const client = createClient<Database>("https://fixture.example", "sb_publishable_synthetic", {
    auth: { persistSession: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input)),
          method = init?.method ?? "GET",
          table = url.pathname.split("/").at(-1)!;
        calls.push({ url, method });
        if (method === "HEAD")
          return new Response(null, {
            headers: { "content-range": `*/${o.residual === table ? 1 : 0}` },
          });
        if (
          (o.error === table && method === "GET") ||
          (o.deleteError === table && method === "DELETE")
        )
          return new Response(JSON.stringify({ code: "42501", message: "Synthetic detail" }), {
            status: 403,
            headers: { "content-type": "application/json" },
          });
        const owner = o.wrongOwner ? id(5) : f.ownerId;
        let rows: any[] = o.empty
          ? []
          : table === "student_intakes"
            ? [{ id: f.intakeId, user_id: owner, student_first_name: f.marker }]
            : table === "pathway_reports"
              ? [
                  {
                    id: f.reportId,
                    user_id: owner,
                    intake_id: f.intakeId,
                    model: "synthetic-ppt-fixture",
                    is_demo: true,
                    student_id: null,
                  },
                ]
              : [{ id: f.prepId, user_id: owner, report_id: f.reportId }];
        if (o.duplicate && table === "ppt_meeting_preps" && method === "GET")
          rows = [...rows, ...rows];
        if (method === "DELETE") rows = [{ id: url.searchParams.get("id")!.replace("eq.", "") }];
        return new Response(JSON.stringify(rows), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  });
  return { client, calls };
}
it("records resolved exact IDs before deleting packet, report and intake, then proves scoped counts", async () => {
  const { client, calls } = setup();
  const save = vi.fn(async () => {
    expect(calls.some((x) => x.method === "DELETE")).toBe(false);
  });
  expect(await cleanupPptExact(client, f, save)).toEqual({ prepIds: [f.prepId], countsZero: true });
  expect(save).toHaveBeenCalledExactlyOnceWith({ prepIds: [f.prepId] });
  const deletes = calls.filter((x) => x.method === "DELETE");
  expect(deletes.map((x) => x.url.searchParams.get("id"))).toEqual(
    [f.prepId, f.reportId, f.intakeId].map((x) => "eq." + x),
  );
  for (const q of deletes) expect(q.url.searchParams.get("user_id")).toBe("eq." + f.ownerId);
  expect(deletes[1].url.searchParams.get("model")).toBe("eq.synthetic-ppt-fixture");
  expect(deletes[2].url.searchParams.get("student_first_name")).toBe("eq." + f.marker);
  expect(calls.filter((x) => x.method === "HEAD")).toHaveLength(6);
});
it.each([
  { duplicate: true },
  { wrongOwner: true },
  { error: "ppt_meeting_preps" },
  { error: "pathway_reports" },
  { error: "student_intakes" },
])("unexpected context %# stops before any deletion", async (o) => {
  const { client, calls } = setup(o);
  await expect(cleanupPptExact(client, f, async () => {})).rejects.toThrow("cleanup stopped");
  expect(calls.some((x) => x.method === "DELETE")).toBe(false);
});
it("receipt failure stops all deletion", async () => {
  const { client, calls } = setup();
  await expect(
    cleanupPptExact(client, f, async () => {
      throw Error("Receipt failed");
    }),
  ).rejects.toThrow("Receipt failed");
  expect(calls.some((x) => x.method === "DELETE")).toBe(false);
});
it.each(["ppt_meeting_preps", "pathway_reports", "student_intakes"])(
  "failed %s deletion stays an error while exact cleanup continues",
  async (table) => {
    const { client, calls } = setup({ deleteError: table });
    await expect(cleanupPptExact(client, f, async () => {})).rejects.toThrow("deletion failed");
    expect(calls.filter((x) => x.method === "DELETE")).toHaveLength(3);
  },
);
it.each([
  "ppt_meeting_preps",
  "pathway_reports",
  "student_intakes",
  "pathway_report_versions",
  "share_tokens",
])("residual %s is never reported as clean", async (table) => {
  const { client } = setup({ residual: table });
  await expect(cleanupPptExact(client, f, async () => {})).rejects.toThrow("absence failed");
});
it("partial setup with no stored rows deletes nothing and still checks allocated identities", async () => {
  const { client, calls } = setup({ empty: true });
  await expect(cleanupPptExact(client, f, async () => {})).resolves.toEqual({
    prepIds: [],
    countsZero: true,
  });
  expect(calls.some((x) => x.method === "DELETE")).toBe(false);
  expect(calls.filter((x) => x.method === "HEAD")).toHaveLength(6);
});
it("invalid marker fails before any request and cannot enter SQL", async () => {
  const { client, calls } = setup();
  await expect(
    cleanupPptExact(client, { ...f, marker: "QA PPT ' unsafe" }, async () => {}),
  ).rejects.toThrow("Invalid");
  expect(calls).toHaveLength(0);
  expect(() => pptExactAbsenceSql({ ...f, ownerId: "bad" })).toThrow("Invalid");
});
it("independent verification is read-only and counts only exact fixture identities", () => {
  const sql = pptExactAbsenceSql(f);
  expect(sql).toContain("BEGIN READ ONLY");
  for (const key of ["intake_count", "report_count", "prep_count", "version_count", "share_count"])
    expect(sql).toContain(key);
  for (const key of [f.intakeId, f.reportId, f.prepId]) expect(sql).toContain(key);
  expect(sql).not.toMatch(/DELETE|UPDATE|INSERT/);
  expect(sql).toContain("current_user<>'postgres'");
});
