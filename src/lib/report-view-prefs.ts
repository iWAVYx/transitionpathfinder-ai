/**
 * Client-side helpers for the Report Viewer UI preferences.
 *
 * These prefs (density, outline open state, collapsed sections) used to live
 * only in localStorage. They now also sync to `user_ui_prefs` so they follow
 * the signed-in user across devices. localStorage is still written as a
 * fast cache for instant load before the server hydration arrives.
 */

import type { ReportViewerPrefs } from "./ui-prefs.functions";

export type CollapsedBlocksHydrationDetail = { collapsedIds: string[] };
export type DensitySetDetail = { density: "compact" | "comfortable" };
export type OutlineSetDetail = { open: boolean };

export const EVT_BLOCKS_HYDRATE = "report-blocks-hydrate";
export const EVT_DENSITY_SET = "report-density-set";
export const EVT_OUTLINE_SET = "report-outline-set";

let pending: ReportViewerPrefs = {};
let timer: ReturnType<typeof setTimeout> | null = null;
let pusher: ((patch: ReportViewerPrefs) => Promise<unknown>) | null = null;
const collapsedSet = new Set<string>();

export function resetCollapsedBlocks(ids: string[]) {
  collapsedSet.clear();
  for (const id of ids) collapsedSet.add(id);
}

export function setBlockCollapsed(id: string, collapsed: boolean) {
  if (collapsed) collapsedSet.add(id);
  else collapsedSet.delete(id);
  queueReportPrefsUpdate({ collapsed_blocks: Array.from(collapsedSet) });
}

export function configureReportPrefsPusher(
  fn: (patch: ReportViewerPrefs) => Promise<unknown>,
) {
  pusher = fn;
}

export function queueReportPrefsUpdate(patch: ReportViewerPrefs) {
  pending = { ...pending, ...patch };
  if (timer) clearTimeout(timer);
  timer = setTimeout(flushReportPrefs, 600);
}

export function flushReportPrefs() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const payload = pending;
  pending = {};
  if (!pusher || Object.keys(payload).length === 0) return;
  void pusher(payload).catch(() => {
    /* best-effort; localStorage still holds the value */
  });
}
