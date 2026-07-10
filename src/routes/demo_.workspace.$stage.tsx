import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SiteShell } from "@/components/site/SiteShell";
import { StageBody, WorkspaceShell } from "@/components/workspace";
import { PathwayReportDeepPreview } from "@/components/pathway/PathwayReportDeepPreview";
import {
  WORKSPACE_STAGES,
  getStage,
  type StageId,
  type WorkspaceStage,
} from "@/lib/workspace/stages";

const STAGE_IDS = WORKSPACE_STAGES.map((s) => s.id) as [StageId, ...StageId[]];
const stageParam = z.enum(STAGE_IDS);

const searchSchema = z.object({
  /**
   * When present and truthy, auto-expand the stage's full-sample panel
   * on load. Used by redirects from the old Transition Studio routes
   * so /demo/intake, /demo/voice, etc. land on the correct stage with
   * its detail view already open.
   */
  expand: z.union([z.boolean(), z.literal("1"), z.literal("true")]).optional(),
});

export const Route = createFileRoute("/demo_/workspace/$stage")({
  parseParams: (raw) => ({ stage: stageParam.parse(raw.stage) }),
  stringifyParams: (parsed) => ({ stage: parsed.stage }),
  validateSearch: (raw) => searchSchema.parse(raw),
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
  const { expand } = Route.useSearch();
  const stage = getStage(stageId);
  const autoExpand = expand === true || expand === "1" || expand === "true";

  return (
    <SiteShell>
      <WorkspaceShell
        activeStageId={stageId}
        hrefFor={hrefForDemoStage}
        eyebrow="Transition Workspace · Public Demo"
        backTo={{ to: "/demo", label: "Back to Demo Overview" }}
      >
        <StageBody stage={stage} expandInPlace defaultExpanded={autoExpand} />
      </WorkspaceShell>
    </SiteShell>
  );
}

function hrefForDemoStage(stage: WorkspaceStage): string {
  return `/demo/workspace/${stage.id}`;
}
