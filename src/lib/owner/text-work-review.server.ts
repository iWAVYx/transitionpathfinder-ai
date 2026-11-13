import { z } from "zod";
import { textWorkQueueInput, textWorkDetailInput, textWorkQueue, textWorkDetail, TEXT_WORK_READ_MESSAGE } from "./text-work-review-contract";
type Context = { userId: unknown; claims: unknown; supabase: unknown };
const id = z.string().uuid().transform(value => value.toLowerCase());
async function read(context: Context, viewer: string, name: string, args: Record<string, unknown>) {
  const actor = id.safeParse(context.userId), claims = z.object({ sub: id, role: z.literal("authenticated") }).safeParse(context.claims);
  if (!actor.success || !claims.success || actor.data !== viewer || claims.data.sub !== viewer) throw new Error(TEXT_WORK_READ_MESSAGE);
  try {
    const client = context.supabase as { rpc: (name: string, args: Record<string,unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
    if (!client || typeof client.rpc !== "function") throw new Error();
    const result = await client.rpc(name, args);
    if (!result || result.error) throw new Error();
    return result.data;
  } catch { throw new Error(TEXT_WORK_READ_MESSAGE); }
}
export async function loadOwnerTextWork(context: Context, input: unknown) {
  const data = textWorkQueueInput.parse(input);
  const result = textWorkQueue.safeParse(await read(context, data.expected_viewer_id, "list_owner_text_work", { _after_operation_id: data.after_operation_id ?? null }));
  if (!result.success) throw new Error(TEXT_WORK_READ_MESSAGE);
  return result.data;
}
export async function inspectOwnerTextWork(context: Context, input: unknown) {
  const data = textWorkDetailInput.parse(input);
  const result = textWorkDetail.safeParse(await read(context, data.expected_viewer_id, "inspect_owner_text_work", { _operation_id: data.operation_id }));
  if (!result.success || result.data.operation_id !== data.operation_id) throw new Error(TEXT_WORK_READ_MESSAGE);
  return result.data;
}
