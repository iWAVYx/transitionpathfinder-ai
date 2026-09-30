import { useState, type ReactNode } from "react";
import { ActionItemsPanel } from "@/components/students/ActionItemsPanel";
import { AuditTrailPanel } from "@/components/students/AuditTrailPanel";
import { CollaboratorsPanel } from "@/components/students/CollaboratorsPanel";
import { CounselorNotesPanel } from "@/components/students/CounselorNotesPanel";
import { GoalsEditor } from "@/components/students/GoalsEditor";
import { MembershipPanel } from "@/components/students/MembershipPanel";
import { PathwayProgress } from "@/components/students/PathwayProgress";
import { ReadinessInsightsCard } from "@/components/students/ReadinessInsightsCard";
import { RecommendedPartnersPanel } from "@/components/students/RecommendedPartnersPanel";
import { RecommendedResourcesPanel } from "@/components/students/RecommendedResourcesPanel";
import { StudentVoicePanel } from "@/components/students/StudentVoicePanel";
import { WhoCanSeeThisPanel } from "@/components/students/WhoCanSeeThisPanel";
import type { Goal, Student } from "@/lib/students.functions";

type Props = {
  section: "plan" | "resources" | "team";
  student: Student | null;
  studentId: string;
  goals: Goal[];
  onChange: () => void | Promise<void>;
};

export function StudentPlanningTools({ section, student, studentId, goals, onChange }: Props) {
  return (
    <div className="mt-4 space-y-3">
      {section === "plan" && (
        <>
          <ToolSection title="Goals" initiallyOpen>
            <GoalsEditor
              studentId={studentId}
              studentFirstName={student?.first_name ?? null}
              goals={goals}
              onChange={onChange}
            />
          </ToolSection>
          <ToolSection title="Student voice">
            <StudentVoicePanel studentId={studentId} />
          </ToolSection>
          <ToolSection title="Action items">
            <ActionItemsPanel studentId={studentId} />
          </ToolSection>
          <ToolSection title="Pathway progress">
            <PathwayProgress studentId={studentId} />
          </ToolSection>
          {student && (
            <ToolSection title="Readiness">
              <ReadinessInsightsCard studentId={studentId} studentFirstName={student.first_name} />
            </ToolSection>
          )}
        </>
      )}
      {section === "resources" && (
        <>
          <ToolSection title="Recommended resources" initiallyOpen>
            <RecommendedResourcesPanel studentId={studentId} />
          </ToolSection>
          <ToolSection title="Partner matches">
            <RecommendedPartnersPanel studentId={studentId} />
          </ToolSection>
        </>
      )}
      {section === "team" && (
        <>
          <ToolSection title="Team members" initiallyOpen>
            <MembershipPanel studentId={studentId} />
            <CollaboratorsPanel studentId={studentId} />
          </ToolSection>
          <ToolSection title="Who can see this">
            <WhoCanSeeThisPanel studentId={studentId} />
          </ToolSection>
          <ToolSection title="Counselor notes">
            <CounselorNotesPanel studentId={studentId} />
          </ToolSection>
          <ToolSection title="Activity history">
            <AuditTrailPanel studentId={studentId} />
          </ToolSection>
        </>
      )}
    </div>
  );
}

function ToolSection({
  title,
  initiallyOpen = false,
  children,
}: {
  title: string;
  initiallyOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="rounded-xl border bg-card p-4"
    >
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      {open && <div className="mt-3">{children}</div>}
    </details>
  );
}
