import { DemoPathwayBuilder } from "@/components/demo/DemoPathwayBuilder";
import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { SiteShell } from "@/components/site/SiteShell";
import { StageBody, WorkspaceShell } from "@/components/workspace";

import { DemoRoleLens } from "@/components/demo/DemoRoleLens";
import { StudentSwitcher } from "@/components/demo/StudentSwitcher";
import { WorkspaceRolePerspective } from "@/components/demo/WorkspaceRolePerspective";
import {
  WORKSPACE_STAGES,
  getStage,
  type StageId,
  type WorkspaceStage,
} from "@/lib/workspace/stages";
import { DEMO_ROLES, DEMO_ROLE_ORDER, type DemoRoleId } from "@/lib/demo/role-previews";
import { backTargetFromWorkspace, coerceExpand, coerceRole } from "@/lib/demo/nav";
import { rememberLastWorkspaceStage } from "@/lib/demo/use-demo-role-view";
import { useDemoPlanningRole } from "@/lib/demo/use-demo-planning-role";
import { useDemoStudent } from "@/lib/demo/use-demo-student";

const STAGE_IDS = WORKSPACE_STAGES.map((s) => s.id) as [StageId, ...StageId[]];
const stageParam = z.enum(STAGE_IDS);

const ROLE_IDS = DEMO_ROLE_ORDER as [DemoRoleId, ...DemoRoleId[]];

export type WorkspaceSearch = {
  expand?: true;
  role?: DemoRoleId;
  student?: string;
};

const searchSchema = z
  .object({
    expand: z.unknown().optional(),
    role: z.unknown().optional(),
    student: z.unknown().optional(),
  })
  .transform((raw): WorkspaceSearch => {
    const out: WorkspaceSearch = {};
    if (coerceExpand(raw.expand)) out.expand = true;
    const role = coerceRole(raw.role);
    if (role) out.role = role;
    if (typeof raw.student === "string") out.student = raw.student;
    return out;
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
  component: DemoWorkspaceEntry,
});

function DemoWorkspaceEntry() {
  const { stage } = Route.useParams();
  return stage === "start" ? <DemoPathwayBuilder /> : <DemoWorkspaceStagePage />;
}

function DemoWorkspaceStagePage() {
  const { stage: stageId } = Route.useParams();
  const search = Route.useSearch();
  const stage = getStage(stageId);
  const navigate = useNavigate();
  const expanded = search.expand === true;
  const { profile } = useDemoStudent();
  const { role: viewRole, setRole } = useDemoPlanningRole(profile.id);

  // Remember the current stage so non-workspace role dashboards can send
  // the visitor back to where they were when they return to a workspace role.
  useEffect(() => {
    rememberLastWorkspaceStage(stageId);
  }, [stageId]);

  const hrefFor = (s: WorkspaceStage) => {
    const params = new URLSearchParams();
    params.set("role", viewRole);
    params.set("student", profile.id);
    const qs = params.toString();
    return `/demo/workspace/${s.id}${qs ? `?${qs}` : ""}`;
  };

  const setExpanded = (next: boolean) => {
    navigate({
      to: "/demo/workspace/$stage",
      params: { stage: stageId },
      search: { ...search, ...(next ? { expand: true as const } : { expand: undefined }) },
      replace: false,
    });
  };

  const productLabel =
    profile.product === "transitionforward" ? "TransitionForward" : "BridgeForward";

  const profileBanner = (
    <div className="flex items-center gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Viewing As
      </p>
      <p className="text-sm font-semibold text-foreground">
        {profile.shortName} · {profile.demographics.gradeLabel} · {productLabel}
      </p>
      <StudentSwitcher size="lg" />
    </div>
  );

  return (
    <SiteShell>
      <DemoRoleLens selectedRole={viewRole} onSelectRole={setRole} />
      <WorkspaceShell
        activeStageId={stageId}
        hrefFor={hrefFor}
        eyebrow="Transition Workspace · Public Demo"
        eyebrowAside={profileBanner}
        backTo={backTargetFromWorkspace({ ...search, role: viewRole, student: profile.id })}
        className="gap-3 py-3 lg:py-4"
      >
        <WorkspaceRolePerspective role={viewRole} stageId={stageId} />
        <StageBody
          stage={stage}
          expandInPlace
          expanded={expanded}
          onExpandChange={setExpanded}
          profile={profile}
        />
      </WorkspaceShell>
    </SiteShell>
  );
}
