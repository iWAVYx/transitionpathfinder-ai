import { useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { StageBody, WorkspaceShell } from "@/components/workspace";
import { getStage, type StageId, type WorkspaceStage } from "@/lib/workspace/stages";
import { DemoRoleLens } from "@/components/demo/DemoRoleLens";

/**
 * Shared renderer for the legacy /demo/* URL aliases (intake, voice,
 * documents, report, resources, opportunities, plan, meeting, calendar,
 * hub, next). Renders the Transition Workspace stage inline while keeping
 * the browser URL on the original /demo/<step> path — no redirect to
 * /demo/workspace/*.
 *
 * These aliases are public and role-safe: they only render sample workspace
 * content and the DemoRoleLens tablist. They never link into protected
 * signed-in surfaces.
 */
export function LegacyDemoStagePage({
  stageId,
  legacyPath,
}: {
  stageId: StageId;
  legacyPath: string;
}) {
  const stage = getStage(stageId);
  const [expanded, setExpanded] = useState(true);

  const hrefFor = (s: WorkspaceStage) => `/demo/workspace/${s.id}`;

  return (
    <SiteShell>
      <DemoRoleLens />
      <WorkspaceShell
        activeStageId={stageId}
        hrefFor={hrefFor}
        eyebrow="Transition Workspace · Public Demo"
        backTo={{ to: "/demo", label: "Back To Demo Overview" }}
      >
        <StageBody
          stage={stage}
          expandInPlace
          expanded={expanded}
          onExpandChange={setExpanded}
        />
        <p className="mt-6 text-xs text-muted-foreground">
          You are viewing <code>{legacyPath}</code> — a legacy demo URL that
          renders the {stage.title} step of the Transition Workspace tour.
        </p>
      </WorkspaceShell>
    </SiteShell>
  );
}
