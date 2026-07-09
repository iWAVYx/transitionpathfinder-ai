import { WORKSPACE_STAGES, type StageId } from "@/lib/workspace/stages";

export function StageProgress({ activeStageId }: { activeStageId: StageId }) {
  const idx = WORKSPACE_STAGES.findIndex((s) => s.id === activeStageId);
  const pct = Math.round(((idx + 1) / WORKSPACE_STAGES.length) * 100);
  return (
    <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      <span>
        Stage {idx + 1} of {WORKSPACE_STAGES.length}
      </span>
      <div
        className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Pathway progress"
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span>{pct}%</span>
    </div>
  );
}
