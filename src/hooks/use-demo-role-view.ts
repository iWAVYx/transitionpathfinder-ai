import { useCallback, useEffect, useState } from "react";

import { DEMO_ROLE_VIEWS, type DemoRoleView } from "@/lib/demo-extras";

const KEY = "tf.demo.roleView";
const EVENT = "tf:demo-role-view";

function read(): DemoRoleView {
  if (typeof window === "undefined") return "student";
  try {
    const v = window.sessionStorage.getItem(KEY);
    if (v && DEMO_ROLE_VIEWS.some((r) => r.id === v)) return v as DemoRoleView;
  } catch {
    /* ignore */
  }
  return "student";
}

/**
 * Demo-wide role lens. Persists across step navigations via sessionStorage
 * so picking "Educator" on /demo/intake carries through to /demo/report,
 * /demo/plan, etc.
 */
export function useDemoRoleView(): [DemoRoleView, (v: DemoRoleView) => void] {
  const [view, setViewState] = useState<DemoRoleView>(() => read());

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<DemoRoleView>).detail;
      if (detail && detail !== view) setViewState(detail);
    }
    window.addEventListener(EVENT, handler as EventListener);
    return () => window.removeEventListener(EVENT, handler as EventListener);
  }, [view]);

  const setView = useCallback((v: DemoRoleView) => {
    setViewState(v);
    try {
      window.sessionStorage.setItem(KEY, v);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: v }));
    } catch {
      /* ignore */
    }
  }, []);

  return [view, setView];
}
