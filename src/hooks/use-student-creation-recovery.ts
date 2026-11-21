import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { readStudentCreationOutcome } from "@/lib/students.functions";
import {
  readCreationIntent,
  saveCreationIntent,
  clearCreationIntent,
  withCreationLock,
  RECOVERY_UNAVAILABLE,
  type CreationIntent,
} from "@/lib/student-creation-recovery";
export function useStudentCreationRecovery(
  viewer: string | undefined,
  current: () => boolean,
  available: boolean,
) {
  const read = useServerFn(readStudentCreationOutcome);
  const [state, setState] = useState<{
    viewer?: string;
    ready: boolean;
    intent: CreationIntent | null;
    error: string | null;
    status?: "present" | "removed" | "unconfirmed";
  }>({ ready: false, intent: null, error: null });
  const refresh = () => {
    if (!viewer || !current()) return;
    try {
      setState({
        viewer,
        ready: true,
        intent: readCreationIntent(localStorage, viewer),
        error: null,
      });
    } catch {
      setState({ viewer, ready: false, intent: null, error: RECOVERY_UNAVAILABLE });
    }
  };
  useEffect(() => {
    refresh();
    const sync = () => refresh();
    window.addEventListener("storage", sync);
    window.addEventListener("tf-creation-recovery", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("tf-creation-recovery", sync);
    };
  }, [viewer, available]);
  const notify = () => window.dispatchEvent(new Event("tf-creation-recovery"));
  const locked = async <T>(work: () => Promise<T>) => {
    if (!viewer) throw Error(RECOVERY_UNAVAILABLE);
    return withCreationLock(viewer, current, work);
  };
  const pending = () => {
    if (!viewer || !current()) throw Error(RECOVERY_UNAVAILABLE);
    return readCreationIntent(localStorage, viewer);
  };
  const reserve = (intent: CreationIntent) => {
    if (!viewer || !current()) throw Error(RECOVERY_UNAVAILABLE);
    saveCreationIntent(localStorage, viewer, intent);
    notify();
  };
  const clear = (intent: CreationIntent) => {
    if (!viewer || !current()) return;
    clearCreationIntent(localStorage, viewer, intent.requestId);
    notify();
  };
  const inspect = async (intent: CreationIntent) => {
    const result = await read({
      data: { expected_viewer_id: viewer!, request_id: intent.requestId, kind: intent.kind },
    });
    if (!current() || pending()?.requestId !== intent.requestId) throw Error(RECOVERY_UNAVAILABLE);
    setState({ viewer, ready: true, intent, error: null, status: result.status });
    return result;
  };
  const check = async () => {
    try {
      await locked(async () => {
        const intent = pending();
        if (intent) await inspect(intent);
        else refresh();
      });
    } catch {
      if (current()) setState((s) => ({ ...s, error: RECOVERY_UNAVAILABLE }));
    }
  };
  const visible = state.viewer === viewer ? state : { ready: false, intent: null, error: null };
  return { ...visible, locked, pending, reserve, clear, inspect, check };
}
