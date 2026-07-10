import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SiteShell } from "@/components/site/SiteShell";
import { StageBody, WorkspaceShell } from "@/components/workspace";
import {
  WORKSPACE_STAGES,
  getStage,
  type StageId,
  type WorkspaceStage,
} from "@/lib/workspace/stages";

const STAGE_IDS = WORKSPACE_STAGES.map((s) => s.id) as [StageId, ...StageId[]];
const stageParam = z.enum(STAGE_IDS);

export const Route = createFileRoute("/demo_/workspace/$stage")({
  parseParams: (raw) => ({ stage: stageParam.parse(raw.stage) }),
  stringifyParams: (parsed) => ({ stage: parsed.stage }),
  head: ({ params }) => {
    const stage = getStage(params.stage);
    return {
      meta: [
        { title: `${stage.title} — Transition Workspace Demo` },
        { name: "description", content: stage.description },
        { property: "og:title", content: `${stage.title} — Transition Workspace` },
        { property: "og:description", content: stage.description },
      ],
    };
  },
  component: DemoWorkspaceStagePage,
});

function DemoWorkspaceStagePage() {
  const { stage: stageId } = Route.useParams();
  const stage = getStage(stageId);

  return (
    <SiteShell>
      <WorkspaceShell
        activeStageId={stageId}
        hrefFor={hrefForDemoStage}
        eyebrow="Transition Workspace · Public Demo"
      >
        <StageBody stage={stage} expandInPlace />
      </WorkspaceShell>
    </SiteShell>
  );
}

function hrefForDemoStage(stage: WorkspaceStage): string {
  return `/demo/workspace/${stage.id}`;
}
