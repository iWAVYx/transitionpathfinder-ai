import { DEMO_ROLES, type DemoRoleId } from "@/lib/demo/role-previews";
import { WORKSPACE_ROLE_IDS, useDemoRoleView } from "@/lib/demo/use-demo-role-view";

/**
 * Accessible role-view lens rendered on demo surfaces so the visitor can
 * flip between the three supported planning perspectives. State is shared via
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
  selectedRole,
}: {
  onSelectRole?: (id: DemoRoleId) => void;
  selectedRole?: DemoRoleId;
} = {}) {
  const { role: storedRole, setRole } = useDemoRoleView(WORKSPACE_ROLE_IDS);
  const role = selectedRole ?? storedRole;

  function handleSelect(next: DemoRoleId) {
    setRole(next);
    onSelectRole?.(next);
  }

  return (
    <div className="border-b border-border/60 bg-muted/30">
      <div
        role="group"
        aria-label="Demo role view"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6 lg:px-8"
      >
        <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Role view
        </span>
        {WORKSPACE_ROLE_IDS.map((id) => {
          const preview = DEMO_ROLES[id];
          const selected = role === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
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
