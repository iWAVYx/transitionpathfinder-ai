import { useCallback, useEffect, useState } from "react";
import {
  DEMO_ROLE_ORDER,
  type DemoRoleId,
} from "@/lib/demo/role-previews";

const STORAGE_KEY = "demo-role-view";
const EVENT = "demo-role-view-changed";
const LAST_STAGE_KEY = "tf.demo.lastWorkspaceStage";

/** Roles that have Transition Workspace views. */
export const WORKSPACE_ROLE_IDS: DemoRoleId[] = ["student", "family", "educator"];

export function isWorkspaceRole(id: DemoRoleId): boolean {
  return WORKSPACE_ROLE_IDS.includes(id);
}

function readStored(): DemoRoleId {
  if (typeof window === "undefined") return "student";
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw && (DEMO_ROLE_ORDER as string[]).includes(raw)) {
      return raw as DemoRoleId;
    }
  } catch {
    /* ignore */
  }
  return "student";
}

function writeStored(id: DemoRoleId) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
  } catch {
    /* ignore */
  }
}

/**
 * Shared demo-role-view state. Persists in sessionStorage and broadcasts
 * across components so DemoRoleLens instances, workspace pages, and role
 * previews all stay in sync in the signed-out demo.
 */
export function useDemoRoleView(): {
  role: DemoRoleId;
  setRole: (id: DemoRoleId) => void;
  hydrated: boolean;
} {
  const [role, setRoleState] = useState<DemoRoleId>("student");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRoleState(readStored());
    setHydrated(true);
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<DemoRoleId>).detail;
      if (detail) setRoleState(detail);
      else setRoleState(readStored());
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const setRole = useCallback((id: DemoRoleId) => {
    setRoleState(id);
    writeStored(id);
  }, []);

  return { role, setRole, hydrated };
}

export function rememberLastWorkspaceStage(stage: string) {
  try {
    window.sessionStorage.setItem(LAST_STAGE_KEY, stage);
  } catch {
    /* ignore */
  }
}

export function readLastWorkspaceStage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(LAST_STAGE_KEY);
  } catch {
    return null;
  }
}
