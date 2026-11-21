import { rightsChanges, rightsReadReceipt, rightsSaveReceipt, parseRightsReadRequest, parseRightsSaveRequest, RIGHTS_READ_UNAVAILABLE, RIGHTS_SAVE_UNCONFIRMED } from "./rights-status-contract";
type Client = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
export async function readCurrentRightsStatus(caller: unknown, actor: string, input: unknown) {
  try {
    const data = parseRightsReadRequest(input);
    if (data.expected_viewer_id !== actor) throw new Error();
    const result = await (caller as Client).rpc("read_student_rights_review", { _student_id: data.student_id, _expected_viewer_id: actor });
    if (result.error !== null) throw new Error();
    const receipt = rightsReadReceipt.parse(result.data);
    if (receipt.actor_id !== actor || receipt.student.id !== data.student_id ||
      receipt.history.some(row => row.student_id !== data.student_id) || new Set(receipt.history.map(row => row.id)).size !== receipt.history.length ||
      (receipt.latest !== null && !receipt.history.some(row => JSON.stringify(row) === JSON.stringify(receipt.latest))) ||
      (!receipt.needs_review && ((receipt.latest !== null && receipt.latest.current_status !== receipt.student.rights_status) ||
        (receipt.latest === null && receipt.student.rights_status !== "unknown_needs_review")))) throw new Error();
    return receipt;
  } catch { throw new Error(RIGHTS_READ_UNAVAILABLE); }
}
export async function saveCurrentRightsStatus(caller: unknown, actor: string, input: unknown) {
  try {
    const data = parseRightsSaveRequest(input);
    if (data.expected_viewer_id !== actor) throw new Error();
    const changes = rightsChanges.parse({ current_status: data.current_status, transfer_notice_date: data.transfer_notice_date,
      student_authorized_parent_access: data.student_authorized_parent_access, decision_making_notes: data.decision_making_notes,
      legal_representative_notes: data.legal_representative_notes });
    const result = await (caller as Client).rpc("save_student_rights_review", { _request_id: data.request_id, _expected_viewer_id: actor,
      _student_id: data.student_id, _expected_revision: data.expected_revision, _changes: changes });
    if (result.error !== null) throw new Error();
    const receipt = rightsSaveReceipt.parse(result.data);
    if (receipt.actor_id !== actor || receipt.request_id !== data.request_id || receipt.student_id !== data.student_id ||
      receipt.expected_revision !== data.expected_revision || receipt.revision === data.expected_revision ||
      receipt.row.student_id !== data.student_id || receipt.row.reviewed_by_user_id !== actor ||
      Object.entries(changes).some(([key, value]) => receipt.row[key as keyof typeof receipt.row] !== value)) throw new Error();
    return receipt;
  } catch { throw new Error(RIGHTS_SAVE_UNCONFIRMED); }
}
