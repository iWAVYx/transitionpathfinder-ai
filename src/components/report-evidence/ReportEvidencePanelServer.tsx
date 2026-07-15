import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ReportEvidencePanel } from "./ReportEvidencePanel";
import {
  attachEvidenceLink,
  detachEvidenceLink,
  listEvidenceForStudent,
} from "@/lib/report-evidence/evidence.functions";
import { listStudents } from "@/lib/students.functions";
import { canEditStudent } from "@/lib/students.functions";

interface Props {
  /** Preferred student id. If omitted, the first student the caller can access is used. */
  studentId?: string;
  scopeLabel?: string;
}

/**
 * Signed-in Evidence → Report panel. Loads evidence for the given student
 * (or the caller's first accessible student) and wires the attach/detach
 * flow through the RLS-protected server functions.
 */
export function ReportEvidencePanelServer({ studentId, scopeLabel }: Props) {
  const qc = useQueryClient();
  const list = useServerFn(listStudents);
  const canEdit = useServerFn(canEditStudent);
  const listEvidence = useServerFn(listEvidenceForStudent);
  const attach = useServerFn(attachEvidenceLink);
  const detach = useServerFn(detachEvidenceLink);

  const studentsQ = useQuery({
    queryKey: ["report-evidence", "students"],
    queryFn: () => list(),
    staleTime: 60_000,
  });

  const resolvedStudentId = useMemo(() => {
    if (studentId) return studentId;
    return studentsQ.data?.students?.[0]?.id;
  }, [studentId, studentsQ.data]);

  const evidenceQ = useQuery({
    queryKey: ["report-evidence", resolvedStudentId ?? "none"],
    enabled: !!resolvedStudentId,
    queryFn: () =>
      listEvidence({ data: { student_id: resolvedStudentId as string } }),
  });

  const editQ = useQuery({
    queryKey: ["report-evidence", "can-edit", resolvedStudentId ?? "none"],
    enabled: !!resolvedStudentId,
    queryFn: () =>
      canEdit({ data: { student_id: resolvedStudentId as string } }),
    staleTime: 60_000,
  });

  const attachM = useMutation({
    mutationFn: attach,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report-evidence", resolvedStudentId] });
      toast.success("Evidence attached to report section");
    },
    onError: (e: Error) => toast.error(e.message || "Attach failed"),
  });

  const detachM = useMutation({
    mutationFn: detach,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report-evidence", resolvedStudentId] });
      toast.success("Evidence removed");
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  if (!studentsQ.isLoading && !resolvedStudentId) {
    return (
      <ReportEvidencePanel
        links={[]}
        scopeLabel={scopeLabel}
        canEdit={false}
        emptyHint="Add a student to your caseload to start mapping evidence to their Pathway Report."
      />
    );
  }

  return (
    <ReportEvidencePanel
      links={evidenceQ.data?.links ?? []}
      scopeLabel={scopeLabel}
      canEdit={!!editQ.data?.canEdit}
      isPending={attachM.isPending || detachM.isPending || evidenceQ.isLoading}
      emptyHint="No evidence attached yet. Use Attach to connect a document, note, goal, meeting, or opportunity to a report section."
      onAttach={async (input) => {
        if (!resolvedStudentId) return;
        await attachM.mutateAsync({
          data: {
            student_id: resolvedStudentId,
            report_section: input.reportSection,
            source_kind: input.sourceKind,
            source_label: input.sourceLabel,
            note: input.note,
          },
        });
      }}
      onDetach={async (id) => {
        await detachM.mutateAsync({ data: { id } });
      }}
    />
  );
}
