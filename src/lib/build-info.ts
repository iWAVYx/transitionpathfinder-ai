import { DASHBOARD_TESTID_CONTRACT_VERSION } from "@/lib/dashboard-testids";

export { DASHBOARD_TESTID_CONTRACT_VERSION };

export const APP_BUILD_SHA =
  import.meta.env.VITE_APP_BUILD_SHA ??
  import.meta.env.VITE_GIT_COMMIT_SHA ??
  "dev";

export const APP_BUILD_TIME = import.meta.env.VITE_APP_BUILD_TIME ?? "dev";