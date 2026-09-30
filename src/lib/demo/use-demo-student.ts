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
  hydrated: boolean;
} {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search }) as unknown as
    | Record<string, unknown>
    | undefined;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });

  const urlId = search && typeof search.student === "string" ? search.student : undefined;

  // Read localStorage lazily on the client only, to avoid SSR hydration mismatches.
  const [storedId, setStoredId] = useState<DemoProfileId | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (isDemoProfileId(raw)) setStoredId(raw);
    } catch {
      /* URL-based navigation works without browser storage. */
    }
    setHydrated(true);
  }, []);

  const profileId: DemoProfileId = isDemoProfileId(urlId)
    ? urlId
    : (storedId ?? DEFAULT_DEMO_PROFILE_ID);

  const profile = useMemo(() => getDemoProfile(profileId), [profileId]);

  // Persist selection to localStorage whenever it changes via URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isDemoProfileId(urlId)) {
      try {
        window.localStorage.setItem(STORAGE_KEY, urlId);
      } catch {
        /* optional storage */
      }
      setStoredId(urlId);
    }
  }, [urlId]);

  const setProfile = useCallback(
    (id: DemoProfileId) => {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY, id);
        } catch {
          /* optional storage */
        }
        setStoredId(id);
      }
      navigate({
        to: pathname,
        hash,
        search: (prev: Record<string, unknown> | undefined) => ({
          ...(prev ?? {}),
          student: id,
        }),
        replace: false,
      });
    },
    [navigate, pathname, hash],
  );

  return { profile, profileId, setProfile, hydrated };
}
