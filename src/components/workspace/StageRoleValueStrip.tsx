import { getStageRoleValues } from "@/lib/workspace/stage-roles";
import type { StageId } from "@/lib/workspace/stages";

/**
 * StageRoleValueStrip — a compact "what this stage means for each
 * role" band rendered inside every Workspace Tour stage. Gives a
 * prospective visitor (parent, educator, admin, partner) an immediate
 * read on the concrete value they'd get from this stage.
 *
 * Kept intentionally light — this is orientation copy, not a card grid.
 * Title Case for role labels; sentence case for value copy.
 */
export function StageRoleValueStrip({ stageId }: { stageId: StageId }) {
  const roles = getStageRoleValues(stageId);
  if (roles.length === 0) return null;
  return (
    <section
      aria-label="What this stage means for each role"
      className="rounded-3xl border border-border bg-muted/30 p-5 sm:p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        What This Means For Each Role
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map(({ role, label, icon: Icon, value }) => (
          <li
            key={role}
            className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background p-3.5"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                For {label}
              </p>
              <p className="mt-0.5 text-sm leading-snug text-foreground">
                {value}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
