import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  DEFAULT_DEMO_PROFILE_ID,
  getDemoProfile,
  isDemoProfileId,
  type DemoProfile,
  type DemoProfileId,
} from "@/lib/demo/demo-profiles";

const STORAGE_KEY = "tf.demo.selectedStudent";

/**
 * Reads the selected demo student from the URL search param `?student=`,
 * falling back to localStorage, then the default (Jordan). Selection is
 * preserved across navigation and browser history because it lives in the
 * URL — links and back/forward keep the same student.
 */
export function useDemoStudent(): {
  profile: DemoProfile;
  profileId: DemoProfileId;
  setProfile: (id: DemoProfileId) => void;
} {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search }) as unknown as
    | Record<string, unknown>
    | undefined;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const urlId = search && typeof search.student === "string" ? search.student : undefined;

  // Read localStorage lazily on the client only, to avoid SSR hydration mismatches.
  const [storedId, setStoredId] = useState<DemoProfileId | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (isDemoProfileId(raw)) setStoredId(raw);
  }, []);

  const profileId: DemoProfileId = isDemoProfileId(urlId)
    ? urlId
    : storedId ?? DEFAULT_DEMO_PROFILE_ID;

  const profile = useMemo(() => getDemoProfile(profileId), [profileId]);

  // Persist selection to localStorage whenever it changes via URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isDemoProfileId(urlId)) {
      window.localStorage.setItem(STORAGE_KEY, urlId);
      setStoredId(urlId);
    }
  }, [urlId]);

  const setProfile = useCallback(
    (id: DemoProfileId) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, id);
        setStoredId(id);
      }
      navigate({
        to: pathname,
        search: (prev: Record<string, unknown> | undefined) => ({
          ...(prev ?? {}),
          student: id,
        }),
        replace: false,
      });
    },
    [navigate, pathname],
  );

  return { profile, profileId, setProfile };
}
