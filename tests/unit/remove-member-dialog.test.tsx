// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RemoveMemberDialog } from "../../src/components/students/RemoveMemberDialog";
import { memberRemovalSchema } from "../../src/lib/chat-history-access";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
afterEach(cleanup);

describe("membership removal choice", () => {
  it("requires an explicit choice and lets the remover cancel without a request", () => {
    const confirm = vi.fn();
    const cancel = vi.fn();
    render(<RemoveMemberDialog name="Jordan" onConfirm={confirm} onCancel={cancel} />);
    expect(
      (screen.getByRole("button", { name: "Remove member" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });
  it.each([
    ["Remove all chat access", "remove"],
    ["Keep past history read-only", "keep_read_only"],
  ])("submits %s once and disables duplicate submissions", async (label, value) => {
    let finish!: () => void;
    const confirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const cancel = vi.fn();
    render(<RemoveMemberDialog name="Jordan" onConfirm={confirm} onCancel={cancel} />);
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(label) }));
    fireEvent.click(screen.getByRole("button", { name: "Remove member" }));
    expect(confirm).toHaveBeenCalledExactlyOnceWith(value);
    expect((screen.getByRole("button", { name: "Removing…" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    finish();
    await waitFor(() => expect(cancel).toHaveBeenCalledOnce());
  });
  it("keeps the choice open on failure so the user can retry", async () => {
    const cancel = vi.fn();
    render(
      <RemoveMemberDialog
        name="Jordan"
        onConfirm={async () => {
          throw new Error("No access");
        }}
        onCancel={cancel}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /Keep past history read-only/ }));
    fireEvent.click(screen.getByRole("button", { name: "Remove member" }));
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Remove member" }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );
    expect(cancel).not.toHaveBeenCalled();
  });
  it("server input rejects missing or invented history choices", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(memberRemovalSchema.safeParse({ id }).success).toBe(false);
    expect(memberRemovalSchema.safeParse({ id, chat_history_access: "keep_live" }).success).toBe(
      false,
    );
    expect(
      memberRemovalSchema.parse({ id, chat_history_access: "keep_read_only" }).chat_history_access,
    ).toBe("keep_read_only");
  });
});
