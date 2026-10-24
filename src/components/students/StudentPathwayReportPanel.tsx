import { PathwayReportCard } from "@/components/students/PathwayReportCard";

type Props = {
  studentId: string;
  studentFirstName: string | null;
  canCreateReport?: boolean;
};

export function StudentPathwayReportPanel({
  studentId,
  studentFirstName,
  canCreateReport = false,
}: Props) {
  return (
    <div className="mt-8">
      <PathwayReportCard
        studentId={studentId}
        studentFirstName={studentFirstName}
        canCreateReport={canCreateReport === true}
      />
    </div>
  );
}
