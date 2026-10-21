import { useMemo, useSyncExternalStore } from "react";
import { useRouter } from "@tanstack/react-router";

type Entry = { pathname: string; href: string; state: { __TSR_index: number } };
export type ScrollIntent = "restore" | "top" | "preserve";

/** Back restores a visit; new pages and Forward start at their content. */
export class NavigationScrollIntent {
  private previous: Entry;
  intent: ScrollIntent = "restore";
  constructor(entry: Entry) { this.previous = entry; }
  update(next: Entry, action: string) {
    const previous = this.previous;
    this.previous = next;
    if (action === "BACK" || (action === "GO" && next.state.__TSR_index < previous.state.__TSR_index)) {
      this.intent = "restore";
    } else if (action === "FORWARD" || action === "GO") {
      this.intent = "top";
    } else if (action === "REPLACE" && next.pathname === previous.pathname) {
      // Canonical sample/organization URLs retain the arrival's intent.
    } else {
      this.intent = next.pathname === previous.pathname ? "preserve" : "top";
    }
    return this.intent;
  }
}

export function useNavigationScrollIntent(): { intent: ScrollIntent; href: string } {
  const router = useRouter();
  const store = useMemo(() => {
    const tracker = new NavigationScrollIntent(router.history.location);
    let snapshot = { intent: tracker.intent, href: router.history.location.href };
    return {
      subscribe: (notify: () => void) => router.history.subscribe(({ location, action }) => {
        tracker.update(location, action.type);
        snapshot = { intent: tracker.intent, href: location.href };
        notify();
      }),
      snapshot: () => snapshot,
    };
  }, [router]);
  return useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
}
