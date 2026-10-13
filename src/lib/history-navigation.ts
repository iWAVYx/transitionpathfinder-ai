import { z } from "zod";
// URL selection is navigation state only. The caller-visible roster and audit RLS remain authoritative.
export const validateHistorySearch = (search: unknown) =>
  z.object({ student_id: z.string().uuid().optional() }).passthrough().parse(search);
