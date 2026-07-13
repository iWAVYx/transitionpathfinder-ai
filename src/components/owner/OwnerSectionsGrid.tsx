import { useNavigate } from "@tanstack/react-router";
import { OWNER_NAV } from "./OwnerShell";
import { toTitleCase } from "@/lib/title-case";

/**
 * Grouped tile grid of every Admin Hub destination.
 *
 * Rendered on the Owner dashboard index as the primary hub affordance —
 * mirrors the sidebar structure so admins can jump to any section from
 * a single scannable surface.
 *
 * IMPORTANT: Tiles are <button> + programmatic navigate (not <Link>).
 * The dashboard regression suite rejects duplicate <a href> inside
 * <main> when the same destinations already exist elsewhere in the
 * page or shell chrome (Operations Overview, Quick Actions, Review
 * Queues panel, sidebar). Buttons avoid the collision entirely.
 */
export function OwnerSectionsGrid() {
  const navigate = useNavigate();
  // Exclude the dashboard itself — we're already on it.
  const items = OWNER_NAV.filter((n) => n.to !== "/owner");
  const groups = Array.from(new Set(items.map((n) => n.group)));

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Admin Sections
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Every workspace across the Admin Hub, grouped by area.
        </p>
      </div>
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g} className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              {toTitleCase(g)}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items
                .filter((n) => n.group === g)
                .map((n) => {
                  const Icon = n.icon;
                  return (
                    <button
                      key={n.to}
                      type="button"
                      onClick={() => navigate({ to: n.to })}
                      aria-label={`Open ${n.label}`}
                      className="group flex items-start gap-2.5 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted"
                    >
                      <span className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-tight">
                          {toTitleCase(n.label)}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {n.to}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
