import { CtTransitionPrompts } from "@/components/students/CtTransitionPrompts";
import { ProfileCompleteness } from "@/components/students/ProfileCompleteness";
import { RightsStatusCard } from "@/components/students/RightsStatusCard";
import type { DocumentRow } from "@/lib/documents.functions";
import type { Goal, Student } from "@/lib/students.functions";

type Props = {
  student: Student | null;
  studentId: string;
  goals: Goal[];
  docs: DocumentRow[];
};

export function StudentProfileSupport({ student, studentId, goals, docs }: Props) {
  return (
    <>
      <ProfileCompleteness student={student} goals={goals} docs={docs} />
      <RightsStatusCard studentId={studentId} />
      <CtTransitionPrompts
        dateOfBirth={student?.date_of_birth ?? null}
        age={null}
        gradeBand={student?.grade_band ?? null}
      />
    </>
  );
}
