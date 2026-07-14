import { useEffect, useState } from "react";
import { DEMO_ROLES, DEMO_ROLE_ORDER, type DemoRoleId } from "@/lib/demo/role-previews";

const STORAGE_KEY = "demo-role-view";

function readStored(): DemoRoleId {
  if (typeof window === "undefined") return "student";
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw && (DEMO_ROLE_ORDER as string[]).includes(raw)) {
      return raw as DemoRoleId;
    }
  } catch {
    /* ignore */
  }
  return "student";
}

/**
 * Accessible role-view lens rendered at the top of /demo and every legacy
 * /demo/* page. Persists the visitor's selected role preview in
 * sessionStorage so it survives step navigation. Purely a client-side
 * lens — never navigates to protected signed-in routes.
 *
 * Accessible name: "Demo role view" (matches signed-in and signed-out
 * demo tests that look up the tablist by /demo role view/i).
 */
export function DemoRoleLens() {
  const [role, setRole] = useState<DemoRoleId>("student");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRole(readStored());
    setHydrated(true);
  }, []);

  function selectRole(next: DemoRoleId) {
    setRole(next);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="border-b border-border/60 bg-muted/30">
      <div
        role="tablist"
        aria-label="Demo role view"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6 lg:px-8"
      >
        <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Role view
        </span>
        {DEMO_ROLE_ORDER.map((id) => {
          const preview = DEMO_ROLES[id];
          const selected = hydrated && role === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectRole(id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              {preview.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
