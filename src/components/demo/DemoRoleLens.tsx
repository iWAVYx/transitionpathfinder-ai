import { DEMO_ROLES, DEMO_ROLE_ORDER, type DemoRoleId } from "@/lib/demo/role-previews";
import { useDemoRoleView } from "@/lib/demo/use-demo-role-view";

/**
 * Accessible role-view lens rendered on demo surfaces so the visitor can
 * flip between the six demo role perspectives. State is shared via
 * `useDemoRoleView` (sessionStorage + broadcast), so every lens instance
 * — dashboard, workspace, and legacy step pages — stays in sync.
 *
 * `onSelectRole` lets a host page intercept selection (for example, to
 * navigate out of the Transition Workspace when the visitor chooses a
 * non-workspace role, or to route back into the workspace when they pick
 * one of the workspace roles). The lens still persists the choice.
 */
export function DemoRoleLens({
  onSelectRole,
}: {
  onSelectRole?: (id: DemoRoleId) => void;
} = {}) {
  const { role, setRole, hydrated } = useDemoRoleView();

  function handleSelect(next: DemoRoleId) {
    setRole(next);
    onSelectRole?.(next);
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
              onClick={() => handleSelect(id)}
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
