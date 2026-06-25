import { useCallback, useEffect, useRef, useState } from "react";

import type { DemoStudentId } from "@/lib/demo-data";
import {
  DEMO_AGENDA_REPORT_LINKS,
  DEMO_MEETING_MINUTES,
  type AgendaReportLink,
} from "@/lib/demo-extras";
import {
  getDemoMeetingEdits,
  resetDemoMeetingEdits,
  saveDemoMeetingEdits,
} from "@/lib/demo-meeting-edits.functions";
import { useAuth } from "@/hooks/use-auth";

export interface MeetingMinuteEntryEdit {
  topic: string;
  decision: string;
  owner: string;
  followUp?: string;
}

export interface MeetingMinutesEdit {
  date: string;
  attendees: string[];
  entries: MeetingMinuteEntryEdit[];
}

export interface DemoMeetingState {
  minutes: MeetingMinutesEdit;
  agenda: AgendaReportLink[];
}

const STORAGE_PREFIX = "tf.demo.meeting.";
const EVENT = "tf:demo-meeting-edit";

function storageKey(student: DemoStudentId) {
  return `${STORAGE_PREFIX}${student}`;
}

function defaults(student: DemoStudentId): DemoMeetingState {
  const m = DEMO_MEETING_MINUTES[student];
  return {
    minutes: {
      date: m.date,
      attendees: [...m.attendees],
      entries: m.entries.map((e) => ({
        topic: e.topic,
        decision: e.decision,
        owner: e.owner,
        followUp: e.followUp,
      })),
    },
    agenda: DEMO_AGENDA_REPORT_LINKS.map((a) => ({ ...a })),
  };
}

function readLocal(student: DemoStudentId): DemoMeetingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(student));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoMeetingState>;
    const base = defaults(student);
    return {
      minutes: parsed.minutes ?? base.minutes,
      agenda: parsed.agenda ?? base.agenda,
    };
  } catch {
    return null;
  }
}

function writeLocal(student: DemoStudentId, state: DemoMeetingState) {
  try {
    window.localStorage.setItem(storageKey(student), JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { student } }));
  } catch {
    /* ignore */
  }
}

function clearLocal(student: DemoStudentId) {
  try {
    window.localStorage.removeItem(storageKey(student));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { student } }));
  } catch {
    /* ignore */
  }
}

/**
 * Editable meeting minutes + agenda→report links for the demo.
 *
 * Persistence strategy:
 * - Signed-in users: rows in `demo_meeting_edits` (Supabase, scoped by RLS to
 *   the user). Edits sync across devices. localStorage acts as an offline
 *   mirror for instant reads.
 * - Signed-out users: localStorage only.
 *
 * Demo-only data — no real student records.
 */
export function useDemoMeetingEdits(student: DemoStudentId) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<DemoMeetingState>(
    () => readLocal(student) ?? defaults(student),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  // Hydrate from backend when signed in / on student change.
  useEffect(() => {
    hydrated.current = false;
    const local = readLocal(student);
    setState(local ?? defaults(student));
    setIsDirty(!!local);

    if (authLoading) return;
    if (!user) {
      hydrated.current = true;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const row = await getDemoMeetingEdits({ data: { student_key: student } });
        if (cancelled) return;
        if (row) {
          const base = defaults(student);
          const next: DemoMeetingState = {
            minutes: (row.minutes as unknown as MeetingMinutesEdit) ?? base.minutes,
            agenda: (row.agenda as unknown as AgendaReportLink[]) ?? base.agenda,
          };
          setState(next);
          setIsDirty(true);
          writeLocal(student, next);
        }
      } catch (err) {
        console.warn("[demo-meeting] backend hydrate failed", err);
      } finally {
        hydrated.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student, user, authLoading]);

  // Listen for cross-tab/local edits.
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ student: DemoStudentId }>).detail;
      if (detail?.student !== student) return;
      const local = readLocal(student);
      if (local) {
        setState(local);
        setIsDirty(true);
      }
    }
    window.addEventListener(EVENT, handler as EventListener);
    return () => window.removeEventListener(EVENT, handler as EventListener);
  }, [student]);

  const scheduleBackendSave = useCallback(
    (next: DemoMeetingState) => {
      if (!user) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSyncing(true);
        try {
          await saveDemoMeetingEdits({
            data: {
              student_key: student,
              minutes: next.minutes,
              agenda: next.agenda,
            },
          });
        } catch (err) {
          console.warn("[demo-meeting] backend save failed", err);
        } finally {
          setSyncing(false);
        }
      }, 600);
    },
    [student, user],
  );

  const persist = useCallback(
    (next: DemoMeetingState) => {
      setState(next);
      setIsDirty(true);
      writeLocal(student, next);
      scheduleBackendSave(next);
    },
    [student, scheduleBackendSave],
  );

  const updateMinuteEntry = useCallback(
    (index: number, patch: Partial<MeetingMinuteEntryEdit>) => {
      setState((prev) => {
        const entries = prev.minutes.entries.map((e, i) =>
          i === index ? { ...e, ...patch } : e,
        );
        const next = { ...prev, minutes: { ...prev.minutes, entries } };
        writeLocal(student, next);
        scheduleBackendSave(next);
        return next;
      });
      setIsDirty(true);
    },
    [student, scheduleBackendSave],
  );

  const updateAgendaItem = useCallback(
    (index: number, patch: Partial<AgendaReportLink>) => {
      setState((prev) => {
        const agenda = prev.agenda.map((a, i) => (i === index ? { ...a, ...patch } : a));
        const next = { ...prev, agenda };
        writeLocal(student, next);
        scheduleBackendSave(next);
        return next;
      });
      setIsDirty(true);
    },
    [student, scheduleBackendSave],
  );

  const reset = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    clearLocal(student);
    setState(defaults(student));
    setIsDirty(false);
    if (user) {
      setSyncing(true);
      try {
        await resetDemoMeetingEdits({ data: { student_key: student } });
      } catch (err) {
        console.warn("[demo-meeting] backend reset failed", err);
      } finally {
        setSyncing(false);
      }
    }
  }, [student, user]);

  return {
    state,
    updateMinuteEntry,
    updateAgendaItem,
    reset,
    isDirty,
    syncing,
    syncedToBackend: !!user,
  };
}

