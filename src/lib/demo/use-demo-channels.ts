/**
 * In-memory store for the demo Transition Channel. Isolated per (role, contextId).
 *
 * Every mutation stays in this module — no server functions, no realtime,
 * no database writes. Safe for a signed-out public visitor to interact with.
 * Session-scoped: state resets on hard reload; that's intentional so the
 * public demo always starts from a known state.
 */
import { useSyncExternalStore, useCallback } from "react";
import {
  getDemoChannelBundle,
  type DemoChannel,
  type DemoChannelBundle,
  type DemoChannelMessage,
  type DemoConnectionRequest,
  type DemoPromotedRecord,
  relativeLabel,
} from "@/lib/demo/transition-channel-data";
import type { DemoRoleId } from "@/lib/demo/role-previews";

type Bundle = DemoChannelBundle & { notifyPref: "all" | "mentions" | "muted" };

const store = new Map<string, Bundle>();
const listeners = new Set<() => void>();

function keyOf(role: DemoRoleId, contextId: string) {
  return `${role}::${contextId}`;
}
function emit() {
  for (const l of listeners) l();
}
function ensure(role: DemoRoleId, contextId: string): Bundle {
  const k = keyOf(role, contextId);
  let b = store.get(k);
  if (!b) {
    b = { ...getDemoChannelBundle(role, contextId), notifyPref: "all" };
    store.set(k, b);
  }
  return b;
}
function update(role: DemoRoleId, contextId: string, fn: (b: Bundle) => Bundle) {
  const k = keyOf(role, contextId);
  const next = fn(ensure(role, contextId));
  store.set(k, next);
  emit();
}

export function useDemoChannels(role: DemoRoleId, contextId: string) {
  const bundle = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      // Ensure entry exists so subsequent reads are consistent across renders.
      return ensure(role, contextId);
    },
    () => ensure(role, contextId),
  );

  const sendMessage = useCallback(
    (channelId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      update(role, contextId, (b) => ({
        ...b,
        channels: b.channels.map((c) =>
          c.id !== channelId
            ? c
            : {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: `local-${Date.now()}`,
                    channelId,
                    authorId: "u-you",
                    authorName: "You (demo)",
                    authorRole: "You",
                    createdAt: new Date().toISOString(),
                    body: trimmed,
                  } satisfies DemoChannelMessage,
                ],
                lastActivityLabel: "just now",
              },
        ),
      }));
    },
    [role, contextId],
  );

  const markRead = useCallback(
    (channelId: string) => {
      update(role, contextId, (b) => ({
        ...b,
        channels: b.channels.map((c) => (c.id === channelId ? { ...c, unread: 0 } : c)),
      }));
    },
    [role, contextId],
  );

  const togglePin = useCallback(
    (channelId: string, messageId: string) => {
      update(role, contextId, (b) => ({
        ...b,
        channels: b.channels.map((c) =>
          c.id !== channelId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, pinned: !m.pinned } : m,
                ),
              },
        ),
      }));
    },
    [role, contextId],
  );

  const addActionItem = useCallback(
    (channelId: string, description: string, assignee = "You") => {
      const trimmed = description.trim();
      if (!trimmed) return;
      update(role, contextId, (b) => ({
        ...b,
        channels: b.channels.map((c) =>
          c.id !== channelId
            ? c
            : {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: `local-ai-${Date.now()}`,
                    channelId,
                    authorId: "u-you",
                    authorName: "You (demo)",
                    authorRole: "You",
                    createdAt: new Date().toISOString(),
                    body: `Action item: ${trimmed}`,
                    actionItem: { assignee, done: false },
                  } satisfies DemoChannelMessage,
                ],
                lastActivityLabel: "just now",
              },
        ),
      }));
    },
    [role, contextId],
  );

  const setNotifyPref = useCallback(
    (pref: Bundle["notifyPref"]) => {
      update(role, contextId, (b) => ({ ...b, notifyPref: pref }));
    },
    [role, contextId],
  );

  const respondToRequest = useCallback(
    (requestId: string, decision: "accepted" | "declined") => {
      update(role, contextId, (b) => {
        const req = b.connectionRequests.find((r) => r.id === requestId);
        if (!req) return b;
        const next: Bundle = {
          ...b,
          connectionRequests: b.connectionRequests.map((r) =>
            r.id === requestId ? { ...r, status: decision } : r,
          ),
        };
        if (decision === "accepted") {
          const newCh: DemoChannel = {
            id: `demo-accepted-${requestId}`,
            kind: "opportunity_referral",
            title: req.proposedChannelTitle,
            purpose: req.purpose,
            members: [
              { id: "u-you", name: "You (demo)", role: "You" },
              { id: `u-req-${requestId}`, name: req.from.name, role: req.from.role },
            ],
            messages: [
              {
                id: `sys-${requestId}`,
                channelId: `demo-accepted-${requestId}`,
                authorId: "system",
                authorName: "System",
                authorRole: "System",
                createdAt: new Date().toISOString(),
                body: `Channel opened with ${req.from.name} (${req.from.org}).`,
              },
            ],
            unread: 0,
            muted: false,
            lastActivityLabel: "just now",
          };
          next.channels = [newCh, ...next.channels];
        }
        return next;
      });
    },
    [role, contextId],
  );

  const replyInThread = useCallback(
    (channelId: string, parentId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      update(role, contextId, (b) => ({
        ...b,
        channels: b.channels.map((c) =>
          c.id !== channelId
            ? c
            : {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: `local-reply-${Date.now()}`,
                    channelId,
                    parentId,
                    authorId: "u-you",
                    authorName: "You (demo)",
                    authorRole: "You",
                    createdAt: new Date().toISOString(),
                    body: trimmed,
                  } satisfies DemoChannelMessage,
                ],
                lastActivityLabel: "just now",
              },
        ),
      }));
    },
    [role, contextId],
  );

  const toggleBookmark = useCallback(
    (channelId: string, messageId: string) => {
      update(role, contextId, (b) => ({
        ...b,
        channels: b.channels.map((c) =>
          c.id !== channelId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, bookmarked: !m.bookmarked } : m,
                ),
              },
        ),
      }));
    },
    [role, contextId],
  );

  const editMessage = useCallback(
    (channelId: string, messageId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      update(role, contextId, (b) => ({
        ...b,
        channels: b.channels.map((c) =>
          c.id !== channelId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, body: trimmed, edited: true } : m,
                ),
              },
        ),
      }));
    },
    [role, contextId],
  );

  const deleteMessage = useCallback(
    (channelId: string, messageId: string) => {
      update(role, contextId, (b) => ({
        ...b,
        channels: b.channels.map((c) =>
          c.id !== channelId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId
                    ? { ...m, body: "This message was removed.", deleted: true, actionItem: undefined, record: undefined, attachment: undefined }
                    : m,
                ),
              },
        ),
      }));
    },
    [role, contextId],
  );

  const promoteToRecord = useCallback(
    (
      channelId: string,
      messageId: string,
      record: Omit<DemoPromotedRecord, "id" | "status" | "integrations"> & {
        integrations: DemoPromotedRecord["integrations"];
      },
    ) => {
      update(role, contextId, (b) => ({
        ...b,
        channels: b.channels.map((c) =>
          c.id !== channelId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId
                    ? {
                        ...m,
                        record: {
                          id: `rec-${Date.now()}`,
                          status: "open",
                          ...record,
                          integrations: {
                            notifiedAssignee: true,
                            ...record.integrations,
                          },
                        },
                      }
                    : m,
                ),
              },
        ),
      }));
    },
    [role, contextId],
  );

  const setRecordStatus = useCallback(
    (channelId: string, messageId: string, status: DemoPromotedRecord["status"]) => {
      update(role, contextId, (b) => ({
        ...b,
        channels: b.channels.map((c) =>
          c.id !== channelId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId && m.record
                    ? { ...m, record: { ...m.record, status } }
                    : m,
                ),
              },
        ),
      }));
    },
    [role, contextId],
  );

  const resetDemoState = useCallback(() => {
    store.delete(keyOf(role, contextId));
    emit();
  }, [role, contextId]);

  return {
    bundle,
    sendMessage,
    markRead,
    togglePin,
    addActionItem,
    setNotifyPref,
    respondToRequest,
    replyInThread,
    toggleBookmark,
    editMessage,
    deleteMessage,
    promoteToRecord,
    setRecordStatus,
    resetDemoState,
    relativeLabel,
  };
}

export function useDemoChannelSummary(role: DemoRoleId, contextId: string) {
  const bundle = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => ensure(role, contextId),
    () => ensure(role, contextId),
  );
  const active = bundle.channels.filter((c) => !c.archived);
  const unread = active.reduce(
    (n, c) => n + (c.muted || bundle.notifyPref === "muted" ? 0 : c.unread),
    0,
  );
  const pendingRequests = bundle.connectionRequests.filter((r) => r.status === "incoming").length;
  return {
    contextLabel: bundle.contextLabel,
    channels: active,
    channelCount: active.length,
    unread,
    pendingRequests,
    top: active.slice(0, 3),
  };
}

export type { DemoChannel, DemoChannelMessage, DemoConnectionRequest };
