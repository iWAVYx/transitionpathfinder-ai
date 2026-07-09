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

export const Route = createFileRoute("/_authenticated/workspace/$stage")({
  parseParams: (raw) => ({ stage: stageParam.parse(raw.stage) }),
  stringifyParams: (parsed) => ({ stage: parsed.stage }),
  head: ({ params }) => {
    const stage = getStage(params.stage);
    return {
      meta: [
        { title: `${stage.title} — Transition Workspace` },
        { name: "description", content: stage.description },
      ],
    };
  },
  component: WorkspaceStagePage,
});

function WorkspaceStagePage() {
  const { stage: stageId } = Route.useParams();
  const stage = getStage(stageId);

  return (
    <SiteShell>
      <WorkspaceShell
        activeStageId={stageId}
        hrefFor={hrefForSignedInStage}
        eyebrow="Transition Workspace"
      >
        <StageBody
          stage={stage}
          workSurfaceHref={stage.signedInRoute}
          workSurfaceLabel="Jump into the live work surface — your data, your team."
        />
      </WorkspaceShell>
    </SiteShell>
  );
}

function hrefForSignedInStage(stage: WorkspaceStage): string {
  return `/workspace/${stage.id}`;
}
