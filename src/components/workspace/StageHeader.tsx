import type { WorkspaceStage } from "@/lib/workspace/stages";
import { toTitleCase } from "@/lib/title-case";

export function StageHeader({ stage }: { stage: WorkspaceStage }) {
  return (
    <header className="border-b border-border pb-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
        {toTitleCase(stage.label)} · Stage {stage.order} of 9
      </p>
      <h1 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl">
        {toTitleCase(stage.title)}
      </h1>
      <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-muted-foreground">
        {stage.description}
      </p>
    </header>
  );
}

