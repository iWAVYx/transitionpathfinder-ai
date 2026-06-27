import type { ReactNode } from "react";

import type { DemoStudentId } from "@/lib/demo-data";
import {
  StudioShell,
  StudioHead,
} from "@/studio/StudioShell";
import type { StudioStageId } from "@/studio/stages";

/**
 * StudioPage — the per-stage wrapper every demo route uses.
 *
 * Replaces the SiteShell + DemoStepBar + PublicationPage chain with the
 * brand-new Pathway Studio shell + a clean stage head. Page bodies pass
 * their existing content as children; the studio CSS layer (`.tf-studio`)
 * re-skins legacy publication primitives that haven't been migrated yet
 * so the visual language stays consistent.
 */
export function StudioPage({
  stage,
  student,
  preserveStudent,
  title,
  dek,
  children,
}: {
  stage: StudioStageId;
  student?: DemoStudentId;
  preserveStudent?: boolean;
  title: ReactNode;
  dek?: ReactNode;
  children: ReactNode;
}) {
  return (
    <StudioShell stage={stage} student={student} preserveStudent={preserveStudent}>
      <StudioHead title={title} dek={dek} />
      <div className="tf-studio-body">{children}</div>
    </StudioShell>
  );
}
