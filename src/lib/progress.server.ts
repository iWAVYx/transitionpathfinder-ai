import { progressReadReceipt, progressWriteReceipt, parseProgressScope, parseProgressSave, progressTimestampKey, PROGRESS_LOAD_UNAVAILABLE, PROGRESS_SAVE_UNCONFIRMED } from "./progress-contract";
type Client = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
export async function readRoadmapProgress(caller: unknown, actor: string, input: unknown) {
  try {
    const data = parseProgressScope(input); if (data.expected_viewer_id !== actor) throw new Error();
    const result = await (caller as Client).rpc("read_student_roadmap_progress", { _student_id: data.student_id, _pathway_id: data.pathway_id, _expected_viewer_id: actor });
    if (result.error !== null) throw new Error(); const receipt = progressReadReceipt.parse(result.data);
    if (receipt.actor_id !== actor || receipt.student_id !== data.student_id || receipt.pathway_id !== data.pathway_id || receipt.total !== receipt.progress.length ||
      receipt.progress.some(row => row.student_id !== data.student_id || row.pathway_id !== data.pathway_id) ||
      new Set(receipt.progress.map(row => row.id)).size !== receipt.progress.length || new Set(receipt.progress.map(row => row.step_index)).size !== receipt.progress.length) throw new Error();
    return { progress: receipt.progress, can_edit: receipt.can_edit };
  } catch { throw new Error(PROGRESS_LOAD_UNAVAILABLE); }
}
export async function saveRoadmapProgress(caller: unknown, actor: string, input: unknown) {
  try {
    const data = parseProgressSave(input); if (data.expected_viewer_id !== actor) throw new Error();
    const result = await (caller as Client).rpc("save_student_roadmap_progress", { _student_id: data.student_id, _pathway_id: data.pathway_id, _expected_viewer_id: actor,
      _step_index: data.step_index, _completed: data.completed, _note: data.note, _expected_row_id: data.expected?.id ?? null, _expected_updated_at: data.expected?.updated_at ?? null });
    if (result.error !== null) throw new Error(); const receipt = progressWriteReceipt.parse(result.data), row = receipt.row;
    if (receipt.actor_id !== actor || receipt.student_id !== data.student_id || receipt.pathway_id !== data.pathway_id || receipt.step_index !== data.step_index ||
      row.student_id !== data.student_id || row.pathway_id !== data.pathway_id || row.step_index !== data.step_index || row.completed !== data.completed || row.note !== data.note || row.updated_by !== actor ||
      (data.expected !== null && (row.id !== data.expected.id || progressTimestampKey(row.updated_at) <= progressTimestampKey(data.expected.updated_at)))) throw new Error();
    return { ok: true as const, row };
  } catch { throw new Error(PROGRESS_SAVE_UNCONFIRMED); }
}
