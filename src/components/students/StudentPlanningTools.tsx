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
  student: Student | null;
  studentId: string;
  goals: Goal[];
  onChange: () => void | Promise<void>;
};

export function StudentPlanningTools({ student, studentId, goals, onChange }: Props) {
  return (
    <>
      <div className="mt-6">
        <GoalsEditor
          studentId={studentId}
          studentFirstName={student?.first_name ?? null}
          goals={goals}
          onChange={onChange}
        />
      </div>

      <div className="mt-6">
        <PathwayProgress studentId={studentId} />
      </div>

      <div className="mt-6">
        <StudentVoicePanel studentId={studentId} />
      </div>

      <div className="mt-6">
        <ActionItemsPanel studentId={studentId} />
      </div>

      {student && (
        <div className="mt-6">
          <ReadinessInsightsCard studentId={studentId} studentFirstName={student.first_name} />
        </div>
      )}

      <div className="mt-6">
        <RecommendedResourcesPanel studentId={studentId} />
      </div>

      <div className="mt-6">
        <RecommendedPartnersPanel studentId={studentId} />
      </div>

      <div className="mt-6">
        <MembershipPanel studentId={studentId} />
      </div>

      <div className="mt-6">
        <WhoCanSeeThisPanel studentId={studentId} />
      </div>

      <div className="mt-6">
        <CollaboratorsPanel studentId={studentId} />
      </div>

      <div className="mt-6">
        <CounselorNotesPanel studentId={studentId} />
      </div>

      <AuditTrailPanel studentId={studentId} />
    </>
  );
}
