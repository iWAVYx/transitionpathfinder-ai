// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const api = vi.hoisted(() => ({ search: {} as any, navigate: vi.fn(), counter: 0 }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => ({ ...options, useSearch: () => api.search }),
  useNavigate: () => api.navigate,
  Link: ({ children, to, ...props }: any) => <a href={to}>{children}</a>,
}));
vi.mock("@/components/site/SiteShell", () => ({
  SiteShell: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/lib/demo/transition-channel-data", async (importOriginal) => {
  const original: any = await importOriginal();
  return {
    ...original,
    getDemoChannelBundle: () => ({
      contextLabel: "Fictional sample",
      connectionRequests: [],
      channels: [
        {
          id: "demo-channel",
          kind: "student_team",
          title: "Sample Team",
          purpose: "Fictional planning",
          members: [],
          unread: 0,
          muted: false,
          lastActivityLabel: "Sample",
          messages: [
            ...Array.from({ length: 25 }, (_, i) => ({
              id: `demo-message-${i}`,
              channelId: "demo-channel",
              authorId: "demo-member",
              authorName: "Sample Member",
              authorRole: "Family",
              body: `Sample pin ${i + 1}`,
              createdAt: "2026-10-15T00:00:00Z",
              pinned: true,
            })),
            {
              id: "demo-removed",
              channelId: "demo-channel",
              authorId: "demo-member",
              authorName: "Sample Member",
              authorRole: "Family",
              body: "Removed sample",
              createdAt: "2026-10-15T00:00:00Z",
              pinned: true,
              deleted: true,
            },
          ],
        },
      ],
    }),
  };
});
import { Route } from "@/routes/demo_.transition-channel";
import { ChannelPinnedMessages } from "@/components/channels/ChannelPinnedMessages";
const Page = (Route as any).component;
beforeEach(() => {
  vi.clearAllMocks();
  api.search = { role: "family", ctx: `pins-${++api.counter}` };
  HTMLElement.prototype.scrollTo = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (fn: () => void) => {
    fn();
    return 0;
  });
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("shared pin presentation and fictional demo", () => {
  it("resets its browse window when the keyed conversation changes", () => {
    const messages = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      body: `Pin ${i + 1}`,
      author_name: null,
    }));
    const open = vi.fn();
    const view = render(<ChannelPinnedMessages key="a" messages={messages} onOpen={open} />);
    fireEvent.click(screen.getByRole("button", { name: "Show More Pinned Messages" }));
    expect(screen.getByText("Showing 20 of 25 pinned messages.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Member: Pin 20" }));
    expect(open).toHaveBeenCalledWith("19");
    view.rerender(<ChannelPinnedMessages key="b" messages={messages} onOpen={open} />);
    expect(screen.getByText("Showing 10 of 25 pinned messages.")).toBeTruthy();
  });
  it.each(["student", "family", "educator", "school-admin", "district-admin", "partner"])(
    "browses and opens fictional pins in the actual %s demo",
    async (role) => {
      api.search.role = role;
      render(<Page />);
      const pins = within(screen.getByRole("region", { name: "Pinned Messages" }));
      expect(pins.getByText("Showing 10 of 25 pinned messages.")).toBeTruthy();
      expect(pins.queryByText("Removed sample")).toBeNull();
      fireEvent.click(pins.getByRole("button", { name: "Show More Pinned Messages" }));
      fireEvent.click(pins.getByRole("button", { name: "Show More Pinned Messages" }));
      expect(pins.getByText("Showing 25 of 25 pinned messages.")).toBeTruthy();
      fireEvent.click(pins.getByRole("button", { name: "Sample Member: Sample pin 25" }));
      expect(screen.getByRole("textbox", { name: "Thread reply" })).toBeTruthy();
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "center",
      });
      expect(api.navigate).not.toHaveBeenCalled();
    },
  );
});
