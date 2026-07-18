import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { SiteShell } from "@/components/site/SiteShell";
import { StageBody, WorkspaceShell } from "@/components/workspace";
import { PathwayReportDeepPreview } from "@/components/pathway/PathwayReportDeepPreview";
import { DemoRoleLens } from "@/components/demo/DemoRoleLens";
import { StudentSwitcher } from "@/components/demo/StudentSwitcher";
import { WorkspaceRolePerspective } from "@/components/demo/WorkspaceRolePerspective";
import {
  WORKSPACE_STAGES,
  getStage,
  type StageId,
  type WorkspaceStage,
} from "@/lib/workspace/stages";
import {
  DEMO_ROLES,
  DEMO_ROLE_ORDER,
  type DemoRoleId,
} from "@/lib/demo/role-previews";
import {
  backTargetFromWorkspace,
  coerceExpand,
  coerceRole,
} from "@/lib/demo/nav";
import {
  isWorkspaceRole,
  rememberLastWorkspaceStage,
  useDemoRoleView,
} from "@/lib/demo/use-demo-role-view";
import { useDemoStudent } from "@/lib/demo/use-demo-student";

const STAGE_IDS = WORKSPACE_STAGES.map((s) => s.id) as [StageId, ...StageId[]];
const stageParam = z.enum(STAGE_IDS);

const ROLE_IDS = DEMO_ROLE_ORDER as [DemoRoleId, ...DemoRoleId[]];

const searchSchema = z
  .object({
    expand: z.unknown().optional(),
    role: z.unknown().optional(),
    student: z.unknown().optional(),
  })
  .transform((raw) => ({
    expand: coerceExpand(raw.expand) || undefined,
    role: coerceRole(raw.role),
    student: typeof raw.student === "string" ? raw.student : undefined,
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
  const { profile } = useDemoStudent();
  const { role: viewRole } = useDemoRoleView();

  // Remember the current stage so non-workspace role dashboards can send
  // the visitor back to where they were when they return to a workspace role.
  useEffect(() => {
    rememberLastWorkspaceStage(stageId);
  }, [stageId]);

  const hrefFor = (s: WorkspaceStage) => {
    const params = new URLSearchParams();
    if (search.role) params.set("role", search.role);
    if (search.student) params.set("student", search.student);
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

  const handleRoleSelect = (next: DemoRoleId) => {
    if (isWorkspaceRole(next)) return; // stay in place; content updates via viewRole
    // Non-workspace roles: route to their dashboard, preserving the student.
    const target = DEMO_ROLES[next].path;
    const qs = search.student ? `?student=${encodeURIComponent(search.student)}` : "";
    navigate({ to: `${target}${qs}` });
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
      <StudentSwitcher className="scale-110" />
    </div>
  );

  return (
    <SiteShell>
      <DemoRoleLens onSelectRole={handleRoleSelect} />
      <WorkspaceShell
        activeStageId={stageId}
        hrefFor={hrefFor}
        eyebrow="Transition Workspace · Public Demo"
        eyebrowAside={profileBanner}
        backTo={backTargetFromWorkspace(search)}
      >
        <WorkspaceRolePerspective role={viewRole} stageId={stageId} />
        <StageBody
          stage={stage}
          expandInPlace
          expanded={expanded}
          onExpandChange={setExpanded}
          profile={profile}
        />
        {stageId === "roadmap" && <PathwayReportDeepPreview profile={profile} />}
      </WorkspaceShell>
    </SiteShell>
  );
}
