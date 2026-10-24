// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  extract: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  onExtracted: vi.fn(),
  confirm: null as any,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/iep-extract.functions", () => ({ extractFromIep: api.extract }));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error } }));
vi.mock("@/components/privacy/SensitiveFilePrivacyReviewDialog", () => ({
  SensitiveFilePrivacyReviewDialog: (props: any) => {
    api.confirm = props.onConfirm;
    return null;
  },
}));
import { IepUpload } from "@/components/pathway/IepUpload";
const text = "Synthetic transition planning text for a fictional student with written directions.";
function pending() {
  let resolve!: (v: any) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.confirm = null;
  api.extract.mockResolvedValue({ extract: { student_first_name: "Sample" } });
});
it("sends the current viewer hint and applies a current extraction", async () => {
  render(<IepUpload viewerId="viewer-a" onExtracted={api.onExtracted} />);
  await act(async () => api.confirm({ text }));
  expect(api.extract).toHaveBeenCalledWith({ data: { text, expected_viewer_id: "viewer-a" } });
  expect(api.onExtracted).toHaveBeenCalledWith({ student_first_name: "Sample" });
  expect(api.success).toHaveBeenCalledOnce();
});
it("blocks duplicate confirmations while the same extraction is pending", async () => {
  const request = pending();
  api.extract.mockReturnValue(request.promise);
  render(<IepUpload viewerId="viewer-a" onExtracted={api.onExtracted} />);
  act(() => {
    api.confirm({ text });
    api.confirm({ text });
  });
  expect(api.extract).toHaveBeenCalledOnce();
  await act(async () => request.resolve({ extract: { student_first_name: "Sample" } }));
  expect(api.onExtracted).toHaveBeenCalledOnce();
});
it.each([false, true])(
  "ignores departed extraction results and notices (failure %s)",
  async (failure) => {
    const request = pending();
    api.extract.mockReturnValueOnce(request.promise);
    const view = render(
      <IepUpload key="student-a" viewerId="viewer-a" onExtracted={api.onExtracted} />,
    );
    act(() => api.confirm({ text }));
    view.rerender(<IepUpload key="student-b" viewerId="viewer-b" onExtracted={api.onExtracted} />);
    await act(async () =>
      failure
        ? request.reject(new Error("Departed private detail"))
        : request.resolve({ extract: { student_first_name: "Old Sample" } }),
    );
    expect(api.onExtracted).not.toHaveBeenCalled();
    expect(api.success).not.toHaveBeenCalled();
    expect(api.error).not.toHaveBeenCalled();
    await act(async () => api.confirm({ text }));
    expect(api.onExtracted).toHaveBeenCalledWith({ student_first_name: "Sample" });
  },
);
it("does not analyze too-short text", async () => {
  render(<IepUpload viewerId="viewer-a" onExtracted={api.onExtracted} />);
  await act(async () => api.confirm({ text: "Short" }));
  expect(api.extract).not.toHaveBeenCalled();
  expect(api.error).toHaveBeenCalledOnce();
});
it("keeps provider errors generic and permits a new reviewed attempt", async () => {
  api.extract.mockRejectedValueOnce(new Error("Private provider details"));
  render(<IepUpload viewerId="viewer-a" onExtracted={api.onExtracted} />);
  await act(async () => api.confirm({ text }));
  expect(api.error).toHaveBeenCalledWith("We couldn't read that document. Please try again.");
  expect(api.onExtracted).not.toHaveBeenCalled();
  await act(async () => api.confirm({ text }));
  expect(api.onExtracted).toHaveBeenCalledOnce();
});
it("an old confirm callback cannot begin analysis after unmount", async () => {
  const view = render(<IepUpload viewerId="viewer-a" onExtracted={api.onExtracted} />);
  const oldConfirm = api.confirm;
  view.unmount();
  await act(async () => oldConfirm({ text }));
  expect(api.extract).not.toHaveBeenCalled();
});
