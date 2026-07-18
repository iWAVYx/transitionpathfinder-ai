import { useCallback, useEffect, useState } from "react";
import type { DemoProfileId } from "@/lib/demo/demo-profiles";

/**
 * Per-profile session state for the public demo. Each profile keeps
 * its own bag of ephemeral edits (e.g. intake answer overrides,
 * completed sample actions) so switching students never bleeds edits
 * from one profile into another. Storage lives in sessionStorage and
 * is namespaced by profile id.
 */
const KEY = (id: DemoProfileId) => `tf.demo.session.${id}`;

export function useProfileSession<T extends Record<string, unknown>>(
  profileId: DemoProfileId,
  initial: T,
): [T, (patch: Partial<T>) => void, () => void] {
  const [state, setState] = useState<T>(initial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(KEY(profileId));
      setState(raw ? { ...initial, ...(JSON.parse(raw) as Partial<T>) } : initial);
    } catch {
      setState(initial);
    }
    // Intentionally only re-hydrate when the profile id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const update = useCallback(
    (patch: Partial<T>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem(KEY(profileId), JSON.stringify(next));
          } catch {
            /* storage quota / private mode — ignore */
          }
        }
        return next;
      });
    },
    [profileId],
  );

  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(KEY(profileId));
      } catch {
        /* ignore */
      }
    }
    setState(initial);
  }, [profileId, initial]);

  return [state, update, reset];
}
