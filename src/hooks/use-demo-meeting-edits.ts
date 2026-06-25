import { useCallback, useEffect, useState } from "react";

import type { DemoStudentId } from "@/lib/demo-data";
import {
  DEMO_AGENDA_REPORT_LINKS,
  DEMO_MEETING_MINUTES,
  type AgendaReportLink,
} from "@/lib/demo-extras";

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

function read(student: DemoStudentId): DemoMeetingState {
  if (typeof window === "undefined") return defaults(student);
  try {
    const raw = window.localStorage.getItem(storageKey(student));
    if (!raw) return defaults(student);
    const parsed = JSON.parse(raw) as Partial<DemoMeetingState>;
    const base = defaults(student);
    return {
      minutes: parsed.minutes ?? base.minutes,
      agenda: parsed.agenda ?? base.agenda,
    };
  } catch {
    return defaults(student);
  }
}

/**
 * Editable meeting minutes + agenda→report links for the demo.
 * Persists per-student overrides in localStorage so edits survive reloads
 * but never leave the browser. Demo-only — no server writes.
 */
export function useDemoMeetingEdits(student: DemoStudentId) {
  const [state, setState] = useState<DemoMeetingState>(() => read(student));

  useEffect(() => {
    setState(read(student));
  }, [student]);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ student: DemoStudentId }>).detail;
      if (detail?.student === student) setState(read(student));
    }
    window.addEventListener(EVENT, handler as EventListener);
    return () => window.removeEventListener(EVENT, handler as EventListener);
  }, [student]);

  const persist = useCallback(
    (next: DemoMeetingState) => {
      setState(next);
      try {
        window.localStorage.setItem(storageKey(student), JSON.stringify(next));
        window.dispatchEvent(new CustomEvent(EVENT, { detail: { student } }));
      } catch {
        /* ignore */
      }
    },
    [student],
  );

  const updateMinuteEntry = useCallback(
    (index: number, patch: Partial<MeetingMinuteEntryEdit>) => {
      const entries = state.minutes.entries.map((e, i) =>
        i === index ? { ...e, ...patch } : e,
      );
      persist({ ...state, minutes: { ...state.minutes, entries } });
    },
    [persist, state],
  );

  const updateAgendaItem = useCallback(
    (index: number, patch: Partial<AgendaReportLink>) => {
      const agenda = state.agenda.map((a, i) => (i === index ? { ...a, ...patch } : a));
      persist({ ...state, agenda });
    },
    [persist, state],
  );

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey(student));
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { student } }));
    } catch {
      /* ignore */
    }
    setState(defaults(student));
  }, [student]);

  const isDirty =
    typeof window !== "undefined" && !!window.localStorage.getItem(storageKey(student));

  return { state, updateMinuteEntry, updateAgendaItem, reset, isDirty };
}
