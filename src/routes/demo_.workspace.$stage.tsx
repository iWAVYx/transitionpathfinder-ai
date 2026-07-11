import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import {
  DEMO_ROLE_ORDER,
  type DemoRoleId,
} from "@/lib/demo/role-previews";
import {
  backTargetFromWorkspace,
  coerceExpand,
  coerceRole,
} from "@/lib/demo/nav";

const STAGE_IDS = WORKSPACE_STAGES.map((s) => s.id) as [StageId, ...StageId[]];
const stageParam = z.enum(STAGE_IDS);

const ROLE_IDS = DEMO_ROLE_ORDER as [DemoRoleId, ...DemoRoleId[]];

const searchSchema = z
  .object({
    /**
     * Auto-expand the stage's full-sample panel. Kept as a plain boolean
     * that round-trips so `<Link search={{ expand: true }}>` and browser
     * back both work naturally.
     */
    expand: z.unknown().optional(),
    /**
     * Which role preview the visitor came from. Used to route "Back"
     * back to that role preview instead of the generic Demo Overview.
     */
    role: z.unknown().optional(),
  })
  .transform((raw) => ({
    expand: coerceExpand(raw.expand) || undefined,
    role: coerceRole(raw.role),
  }));

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
  const search = Route.useSearch();
  const stage = getStage(stageId);
  const navigate = useNavigate();
  const expanded = search.expand === true;

  const hrefFor = (s: WorkspaceStage) => {
    const params = new URLSearchParams();
    if (search.role) params.set("role", search.role);
    const qs = params.toString();
    return `/demo/workspace/${s.id}${qs ? `?${qs}` : ""}`;
  };

  const setExpanded = (next: boolean) => {
    navigate({
      to: "/demo/workspace/$stage",
      params: { stage: stageId },
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        expand: next ? true : undefined,
      }),
      replace: false,
    });
  };

  return (
    <SiteShell>
      <WorkspaceShell
        activeStageId={stageId}
        hrefFor={hrefFor}
        eyebrow="Transition Workspace · Public Demo"
        backTo={backTargetFromWorkspace(search)}
      >
        <StageBody
          stage={stage}
          expandInPlace
          expanded={expanded}
          onExpandChange={setExpanded}
        />
        {stageId === "roadmap" && <PathwayReportDeepPreview />}
      </WorkspaceShell>
    </SiteShell>
  );
}
