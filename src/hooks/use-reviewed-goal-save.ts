import { useEffect, useRef, useState } from "react";

/** A lost/malformed response cannot prove whether a write committed. Pause this
 * review after uncertainty; do not replay the mutation or clear its proposals.
 * The containing student page is keyed by authenticated viewer and student. */
export function useReviewedGoalSave() {
  const active = useRef(false);
  const pending = useRef(false);
  const uncertain = useRef(false);
  const [saving, setSaving] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  async function run(save: () => Promise<{ inserted: number }>, expectedCount: number) {
    if (!active.current || pending.current || uncertain.current || !Number.isSafeInteger(expectedCount) || expectedCount < 1 || expectedCount > 20) return "blocked" as const;
    pending.current = true;
    setSaving(true);
    try {
      const result = await save();
      if (!active.current) return "departed" as const;
      if (!result || result.inserted !== expectedCount) throw new Error("Unconfirmed receipt");
      return "saved" as const;
    } catch {
      if (!active.current) return "departed" as const;
      uncertain.current = true;
      setUnconfirmed(true);
      return "uncertain" as const;
    } finally {
      pending.current = false;
      if (active.current) setSaving(false);
    }
  }
  return { run, saving, unconfirmed };
}
