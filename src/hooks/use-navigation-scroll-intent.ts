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

type ScrollPoint = { scrollX: number; scrollY: number };
type ScrollLocation = { href: string; pathname: string };

/** Preserve one departure while a visible route is still awaiting acknowledgement. */
export class PendingScrollReturn {
  private departure?: ScrollLocation & ScrollPoint;
  private restored?: ScrollLocation & ScrollPoint;
  begin(from: ScrollLocation | undefined, to: ScrollLocation, point: ScrollPoint) {
    if (this.departure && from?.href === this.departure.href && to.href === this.departure.href) {
      // The router still calls this the source, but the DOM can already be the
      // receiving tool's short loading shell. Its zero must not replace departure.
      this.restored = this.departure;
    } else if (!this.departure && from && from.pathname !== to.pathname) {
      this.departure = { href: from.href, pathname: from.pathname, ...point };
    }
  }
  settle() { this.departure = undefined; }
  arrive(href: string) {
    if (this.restored?.href !== href) this.restored = undefined;
  }
  position(href: string): ScrollPoint | undefined {
    return this.restored?.href === href
      ? { scrollX: this.restored.scrollX, scrollY: this.restored.scrollY } : undefined;
  }
}

export function useNavigationScrollIntent(): { intent: ScrollIntent; href: string; position?: ScrollPoint } {
  const router = useRouter();
  const store = useMemo(() => {
    const tracker = new NavigationScrollIntent(router.history.location);
    const pending = new PendingScrollReturn();
    const read = () => ({
      intent: tracker.intent,
      href: router.history.location.href,
      position: tracker.intent === "restore" ? pending.position(router.history.location.href) : undefined,
    });
    let snapshot = read();
    return {
      subscribe: (notify: () => void) => {
        const publish = () => { snapshot = read(); notify(); };
        const stopLoad = router.subscribe("onBeforeLoad", event => {
          if (typeof window === "undefined") return;
          pending.begin(event.fromLocation, event.toLocation, { scrollX: window.scrollX, scrollY: window.scrollY });
          publish();
        });
        const stopResolved = router.subscribe("onResolved", () => { pending.settle(); publish(); });
        const stopHistory = router.history.subscribe(({ location, action }) => {
          tracker.update(location, action.type);
          pending.arrive(location.href);
          publish();
        });
        return () => { stopLoad(); stopResolved(); stopHistory(); };
      },
      snapshot: () => snapshot,
    };
  }, [router]);
  return useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
}
