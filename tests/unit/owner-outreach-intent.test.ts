import { describe, it, expect, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse = (v: any) => v;
    const b = {
      middleware: () => b,
      validator: (v: any) => {
        parse = v;
        return b;
      },
      handler:
        (fn: any) =>
        ({ data, context }: any) =>
          fn({ data: parse(data), context }),
    };
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import {
  listOutreach,
  upsertOutreach,
  deleteOutreach,
} from "@/lib/validation/validation.functions";
import { outreachInputSchema } from "@/lib/validation/outreach-contract";
const id = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222",
  viewer = "viewer-a",
  date = "2026-10-15T00:00:00Z";
function row(patch: any = {}) {
  return {
    id,
    contact_name: "Sample Contact",
    organization: null,
    role_type: null,
    email: null,
    phone: null,
    relationship_notes: null,
    notes: null,
    outreach_status: "not_contacted",
    last_contacted_at: null,
    next_follow_up_at: null,
    created_at: date,
    updated_at: date,
    ...patch,
  };
}
function query(rows: any[], patch: any = {}) {
  const q: any = { filters: {}, window: [0, 499], values: null };
  q.select = vi.fn(() => q);
  q.order = vi.fn(() => q);
  q.range = vi.fn((a: number, b: number) => {
    q.window = [a, b];
    return q;
  });
  for (const m of ["eq", "in"])
    q[m] = vi.fn((key: string, value: any) => {
      q.filters[key] = value;
      return q;
    });
  for (const m of ["insert", "update"])
    q[m] = vi.fn((values: any) => {
      q.values = values;
      return q;
    });
  q.delete = vi.fn(() => q);
  q.single = vi.fn(async () => ({ data: rows[0] ?? null, error: null, ...patch }));
  q.then = (a: any, b: any) =>
    Promise.resolve({
      data: rows.slice(q.window[0], q.window[1] + 1),
      count: rows.length,
      error: null,
      ...patch,
    }).then(a, b);
  return q;
}
function admin(role = "platform_owner") {
  return query([{ id: other, user_id: viewer, role }]);
}
function call(fn: any, data: any, ...queries: any[]) {
  const from = vi.fn(() => {
    const q = queries.shift();
    if (!q) throw Error("Unexpected query");
    return q;
  });
  return {
    from,
    result: Promise.resolve().then(() =>
      fn({ data, context: { userId: viewer, supabase: { from } } }),
    ),
  };
}
describe("Owner outreach confirmation and scope", () => {
  it.each([listOutreach, upsertOutreach, deleteOutreach])(
    "rejects changed viewer before role/data access",
    async (fn) => {
      const c = call(fn, { id, contact_name: "Sample Contact", expected_viewer_id: "other" });
      await expect(c.result).rejects.toThrow();
      expect(c.from).not.toHaveBeenCalled();
    },
  );
  it.each(["support_admin", "admin", "teacher", "partner", "parent"])(
    "does not promote %s metadata into Owner access",
    async (role) => {
      const c = call(listOutreach, {}, admin(role));
      await expect(c.result).rejects.toThrow();
      expect(c.from).toHaveBeenCalledExactlyOnceWith("admin_roles");
    },
  );
  it.each(["platform_owner", "platform_admin"])("retains confirmed %s access", async (role) => {
    await expect(call(listOutreach, {}, admin(role), query([])).result).resolves.toEqual({
      rows: [],
    });
  });
  it.each([{ data: null }, { count: null }, { error: { message: "private" } }])(
    "fails unavailable Owner metadata %j",
    async (patch) => {
      const c = call(upsertOutreach, { contact_name: "Sample Contact" }, query([], patch));
      await expect(c.result).rejects.toThrow();
      expect(c.from).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects another caller's returned admin row", async () => {
    await expect(
      call(listOutreach, {}, query([{ id: other, user_id: "other", role: "platform_owner" }]))
        .result,
    ).rejects.toThrow();
  });
  it("allows a name-only contact and normalizes optional whitespace to null", async () => {
    const q = query([row()]);
    const data = {
      contact_name: " Sample Contact ",
      email: " ",
      phone: "",
      organization: " ",
      role_type: "",
      notes: "",
      expected_viewer_id: viewer,
    };
    await expect(call(upsertOutreach, data, admin(), q).result).resolves.toEqual({ row: row() });
    expect(q.insert).toHaveBeenCalledWith({
      contact_name: "Sample Contact",
      email: null,
      phone: null,
      organization: null,
      role_type: null,
      notes: null,
    });
    expect(q.values).not.toHaveProperty("expected_viewer_id");
  });
  it.each([
    { contact_name: " " },
    { contact_name: "Name", email: "broken" },
    { contact_name: "Name", outreach_status: "verified" },
    { contact_name: "Name", expected_updated_at: date },
  ])("retains input boundaries %j", async (data) => {
    const c = call(upsertOutreach, data);
    await expect(c.result).rejects.toThrow();
    expect(c.from).not.toHaveBeenCalled();
  });
  it("conditionally updates only the submitted fields on the captured row version", async () => {
    const q = query([row({ outreach_status: "interested" })]);
    await expect(
      call(
        upsertOutreach,
        {
          id,
          contact_name: "Sample Contact",
          outreach_status: "interested",
          expected_updated_at: date,
        },
        admin(),
        q,
      ).result,
    ).resolves.toMatchObject({ row: { id, outreach_status: "interested" } });
    expect(q.update).toHaveBeenCalledWith({
      contact_name: "Sample Contact",
      outreach_status: "interested",
    });
    expect(q.eq).toHaveBeenCalledWith("id", id);
    expect(q.eq).toHaveBeenCalledWith("updated_at", date);
  });
  it.each([
    null,
    row({ id: other }),
    row({ outreach_status: "not_interested" }),
    row({ updated_at: "bad" }),
  ])("cannot acknowledge missing/wrong/unconfirmed saved row %j", async (saved) => {
    await expect(
      call(
        upsertOutreach,
        { id, contact_name: "Sample Contact", outreach_status: "interested" },
        admin(),
        query([], { data: saved }),
      ).result,
    ).rejects.toThrow("couldn't confirm");
  });
  it("cannot acknowledge a resolved server error with a row", async () => {
    await expect(
      call(
        upsertOutreach,
        { contact_name: "Sample Contact" },
        admin(),
        query([row()], { error: { message: "private" } }),
      ).result,
    ).rejects.toThrow("couldn't confirm");
  });
  it("confirms equal timestamps represented with different offsets", async () => {
    await expect(
      call(
        upsertOutreach,
        { id, contact_name: "Sample Contact", next_follow_up_at: "2026-10-14T20:00:00-04:00" },
        admin(),
        query([row({ next_follow_up_at: date })]),
      ).result,
    ).resolves.toMatchObject({ row: { id } });
  });
  it("normalizes blank email without accepting malformed nonempty email", () => {
    expect(outreachInputSchema.parse({ contact_name: "Name", email: "" }).email).toBeNull();
    expect(() => outreachInputSchema.parse({ contact_name: "Name", email: "not email" })).toThrow();
  });
  it("loads all 605 recorded contacts with stable counted paging", async () => {
    const rows = Array.from({ length: 605 }, (_, i) =>
        row({ id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}` }),
      ),
      q = query(rows);
    const result = await call(listOutreach, undefined, admin(), q, q).result;
    expect(result.rows).toHaveLength(605);
    expect(q.range.mock.calls).toEqual([
      [0, 499],
      [500, 999],
    ]);
    expect(q.order).toHaveBeenCalledWith("id");
  });
  it.each([{ count: null }, { error: { message: "private" } }, { data: null }])(
    "does not report failed reads as zero contacts %j",
    async (patch) => {
      await expect(call(listOutreach, {}, admin(), query([], patch)).result).rejects.toThrow();
    },
  );
  it("rejects duplicate contact identities", async () => {
    await expect(call(listOutreach, {}, admin(), query([row(), row()])).result).rejects.toThrow();
  });
  it.each([null, { id: other }])("does not acknowledge empty/wrong deletion %j", async (saved) => {
    await expect(
      call(deleteOutreach, { id }, admin(), query([], { data: saved })).result,
    ).rejects.toThrow("couldn't confirm");
  });
  it("confirms version-scoped deletion of the original id", async () => {
    const q = query([{ id }]);
    await expect(
      call(deleteOutreach, { id, expected_updated_at: date }, admin(), q).result,
    ).resolves.toEqual({ ok: true, id });
    expect(q.eq).toHaveBeenCalledWith("id", id);
    expect(q.eq).toHaveBeenCalledWith("updated_at", date);
  });
});
