import { z } from "zod";

/** Navigation context only; the server independently verifies role and student access. */
export const nextActionContextSchema = z.object({
  role: z.enum(["student", "family", "educator", "partner"]).optional(),
  student_id: z.string().uuid().optional(),
});
export type NextActionContext = z.infer<typeof nextActionContextSchema>;

export function personalActionToolSearch(
  role: string,
  studentId?: string,
): NextActionContext | undefined {
  if (!["student", "family", "educator", "partner"].includes(role)) return undefined;
  return nextActionContextSchema.parse({ role, ...(studentId ? { student_id: studentId } : {}) });
}
