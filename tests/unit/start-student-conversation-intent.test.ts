import { describe, it, expect, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse = (v: any) => v;
    const builder = {
      middleware: () => builder,
      validator: (fn: any) => {
        parse = fn;
        return builder;
      },
      handler:
        (fn: any) =>
        ({ data, context }: any) =>
          fn({ data: parse(data), context }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import {
  listStartableStudentChannels,
  listStudentChannelRecipients,
  startStudentChannel,
} from "@/lib/channels.functions";
const viewer = "11111111-1111-4111-8111-111111111111",
  student = "22222222-2222-4222-8222-222222222222",
  recipient = "33333333-3333-4333-8333-333333333333",
  channel = "44444444-4444-4444-8444-444444444444";
const input = {
  expected_viewer_id: viewer,
  student_id: student,
  recipient_id: recipient,
  title: " Planning ",
  first_message: " Hello team ",
};
function call(fn: any, data: any, result: any = { data: [], error: null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return {
    rpc,
    result: Promise.resolve().then(() =>
      fn({ data, context: { userId: viewer, supabase: { rpc } } }),
    ),
  };
}
describe("student conversation caller intent and RPC confirmation", () => {
  it.each([listStartableStudentChannels, listStudentChannelRecipients, startStudentChannel])(
    "rejects departed viewer before RPC",
    async (fn) => {
      const c = call(fn, { ...input, expected_viewer_id: recipient });
      await expect(c.result).rejects.toThrow();
      expect(c.rpc).not.toHaveBeenCalled();
    },
  );
  it("acknowledges only a valid channel UUID and sends no client actor", async () => {
    const c = call(
      startStudentChannel,
      { ...input, actor_id: recipient },
      { data: channel, error: null },
    );
    await expect(c.result).resolves.toEqual({
      channel_id: channel,
      student_id: student,
      recipient_id: recipient,
    });
    expect(c.rpc).toHaveBeenCalledExactlyOnceWith("start_student_channel", {
      p_student_id: student,
      p_recipient_id: recipient,
      p_title: "Planning",
      p_first_message: "Hello team",
    });
  });
  it.each([null, "", "new-channel", true, { id: channel }, [channel]])(
    "rejects malformed created identity %j",
    async (data) => {
      await expect(call(startStudentChannel, input, { data, error: null }).result).rejects.toThrow(
        "couldn't confirm",
      );
    },
  );
  it("does not acknowledge an RPC error with an id", async () => {
    await expect(
      call(startStudentChannel, input, { data: channel, error: { message: "private metadata" } })
        .result,
    ).rejects.toThrow("Check your conversations");
  });
  it("rejects self-recipient before any write", async () => {
    const c = call(startStudentChannel, { ...input, recipient_id: viewer });
    await expect(c.result).rejects.toThrow("different");
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it("retains no-hint legacy calls without inventing actor arguments", async () => {
    const { expected_viewer_id: _, ...legacy } = input;
    await expect(
      call(startStudentChannel, legacy, { data: channel, error: null }).result,
    ).resolves.toMatchObject({ channel_id: channel });
    await expect(call(listStartableStudentChannels, undefined).result).resolves.toEqual({
      students: [],
      may_have_more: false,
    });
  });
  it.each([
    { title: " " },
    { title: "a".repeat(121) },
    { first_message: " " },
    { first_message: "a".repeat(4001) },
    { recipient_id: "bad" },
    { student_id: "bad" },
  ])("retains input boundaries %j", async (patch) => {
    const c = call(startStudentChannel, { ...input, ...patch });
    await expect(c.result).rejects.toThrow();
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it("returns real empty team/recipient collections", async () => {
    await expect(call(listStartableStudentChannels, {}).result).resolves.toEqual({
      students: [],
      may_have_more: false,
    });
    await expect(call(listStudentChannelRecipients, input).result).resolves.toEqual({
      student_id: student,
      recipients: [],
    });
  });
  it.each([
    null,
    {},
    [{ student_id: "bad", student_name: "Student" }],
    [{ student_id: student, student_name: 7 }],
    [
      { student_id: student, student_name: "One" },
      { student_id: student, student_name: "Two" },
    ],
  ])("fails malformed/duplicate team reads %j", async (data) => {
    await expect(
      call(listStartableStudentChannels, {}, { data, error: null }).result,
    ).rejects.toThrow("Could not load");
  });
  it.each([
    null,
    {},
    [{ user_id: viewer, display_name: "Self" }],
    [{ user_id: "bad", display_name: "Member" }],
    [
      { user_id: recipient, display_name: "One" },
      { user_id: recipient, display_name: "Two" },
    ],
  ])("fails malformed/duplicate/self recipient reads %j", async (data) => {
    await expect(
      call(listStudentChannelRecipients, input, { data, error: null }).result,
    ).rejects.toThrow("Could not load");
  });
  it.each([listStartableStudentChannels, listStudentChannelRecipients])(
    "does not turn an RPC error into an empty team",
    async (fn) => {
      await expect(
        call(fn, input, { data: [], error: { message: "private" } }).result,
      ).rejects.toThrow("Could not load");
    },
  );
  it("discloses the existing 100-student RPC boundary", async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      student_id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      student_name: `Student ${i}`,
    }));
    await expect(
      call(listStartableStudentChannels, {}, { data: rows, error: null }).result,
    ).resolves.toEqual({ students: rows, may_have_more: true });
  });
  it("returns the original student in recipient context", async () => {
    const c = call(listStudentChannelRecipients, input, {
      data: [{ user_id: recipient, display_name: "Member" }],
      error: null,
    });
    await expect(c.result).resolves.toEqual({
      student_id: student,
      recipients: [{ user_id: recipient, display_name: "Member" }],
    });
    expect(c.rpc).toHaveBeenCalledWith("list_student_channel_recipients", {
      p_student_id: student,
    });
  });
});
