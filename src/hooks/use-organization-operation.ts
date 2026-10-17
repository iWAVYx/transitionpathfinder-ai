import { useCallback, useEffect, useRef } from "react";

/** Submitted writes retain their original scope; only current readers receive completion effects. */
export function useOrganizationOperation(organizationId: string) {
  const generation = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    ++generation.current;
    return () => {
      mounted.current = false;
      ++generation.current;
    };
  }, [organizationId]);
  return useCallback(() => {
    const ticket = generation.current;
    return () => mounted.current && generation.current === ticket;
  }, []);
}
