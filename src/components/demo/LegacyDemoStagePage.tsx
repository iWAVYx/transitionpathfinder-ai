import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { StageBody, WorkspaceShell } from "@/components/workspace";
import { getStage, type StageId, type WorkspaceStage } from "@/lib/workspace/stages";
import { DemoRoleLens } from "@/components/demo/DemoRoleLens";
import { StudentSwitcher } from "@/components/demo/StudentSwitcher";
import { WorkspaceRolePerspective } from "@/components/demo/WorkspaceRolePerspective";
import { useDemoStudent } from "@/lib/demo/use-demo-student";
import { DEMO_ROLES, type DemoRoleId } from "@/lib/demo/role-previews";
import {
  isWorkspaceRole,
  rememberLastWorkspaceStage,
  useDemoRoleView,
} from "@/lib/demo/use-demo-role-view";

/**
 * Shared renderer for the legacy /demo/* URL aliases (intake, voice,
 * documents, report, resources, opportunities, plan, meeting, calendar,
 * hub, next). Renders the Transition Workspace stage inline while keeping
 * the browser URL on the original /demo/<step> path.
 *
 * Role switching: workspace roles (Student / Family / Educator) update
 * the perspective in place; non-workspace roles route the visitor to
 * their own demo dashboard, preserving the selected student.
 */
export function LegacyDemoStagePage({
  stageId,
  legacyPath,
  afterStage,
}: {
  stageId: StageId;
  legacyPath: string;
  afterStage?: ReactNode;
}) {
  const stage = getStage(stageId);
  const [expanded, setExpanded] = useState(true);
  const { profile } = useDemoStudent();
  const navigate = useNavigate();
  const { role: viewRole } = useDemoRoleView();

  useEffect(() => {
    rememberLastWorkspaceStage(stageId);
  }, [stageId]);

  const hrefFor = (s: WorkspaceStage) => `/demo/workspace/${s.id}`;
  const disallowed = profile.stage.disallowedThemes;

  const handleRoleSelect = (next: DemoRoleId) => {
    if (isWorkspaceRole(next)) return;
    navigate({ to: `${DEMO_ROLES[next].path}?student=${encodeURIComponent(profile.id)}` });
  };

  return (
    <SiteShell>
      <DemoRoleLens onSelectRole={handleRoleSelect} />
      <WorkspaceShell
        activeStageId={stageId}
        hrefFor={hrefFor}
        eyebrow="Transition Workspace · Public Demo"
        backTo={{ to: "/demo", label: "Back To Demo Overview" }}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Viewing As
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {profile.shortName} · {profile.demographics.gradeLabel} ·{" "}
              {profile.product === "transitionforward" ? "TransitionForward" : "BridgeForward"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {profile.tagline}
            </p>
          </div>
          <StudentSwitcher />
        </div>
        <WorkspaceRolePerspective role={viewRole} stageId={stageId} />
        <StageBody
          stage={stage}
          expandInPlace
          expanded={expanded}
          onExpandChange={setExpanded}
          profile={profile}
        />

        {disallowed && disallowed.length > 0 && (
          <p className="mt-4 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Age-aware:</span> content
            excluded for {profile.shortName} ({profile.demographics.gradeLabel}) —{" "}
            {disallowed.map((t) => t.replace(/_/g, " ")).join(", ")}.
          </p>
        )}
        {afterStage}
        <p className="mt-6 text-xs text-muted-foreground">
          You are viewing <code>{legacyPath}</code> — a legacy demo URL that
          renders the {stage.title} step of the Transition Workspace tour.
        </p>
      </WorkspaceShell>
    </SiteShell>
  );
}

