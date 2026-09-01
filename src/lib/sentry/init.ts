/**
 * Sentry browser initialization — call exactly once, client-side only.
 *
 * Deliberately omits:
 *  - Session Replay (never registered, so no replay bundle is even loaded)
 *  - sendDefaultPii (false: no IPs, no cookies, no request bodies)
 *
 * Everything that does get sent is scrubbed by `redactSentryEvent`.
 */

import {
  captureMessage,
  init as initBrowserSentry,
  normalizeStringifyValue as normalizeBrowserStringifyValue,
  setContext,
} from "@sentry/browser";
import { applySdkMetadata, isSyntheticEvent, setNormalizeStringifier } from "@sentry/core/browser";
import { version as reactVersion } from "react";

import { APP_BUILD_SHA } from "@/lib/build-info";
import { resolveSentryConfig } from "./config";
import { redactSentryEvent } from "./redact";

let initialized = false;

function initReactSentry(options: Parameters<typeof initBrowserSentry>[0]) {
  const reactOptions = { ...options };
  applySdkMetadata(reactOptions, "react");
  setContext("react", { version: reactVersion });
  const client = initBrowserSentry(reactOptions);
  setNormalizeStringifier((value) =>
    isSyntheticEvent(value) ? "[SyntheticEvent]" : normalizeBrowserStringifyValue(value),
  );
  return client;
}

export function initSentry(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;

  const { dsn, environment, enabled } = resolveSentryConfig(window.location.hostname);
  // No DSN pasted yet (or an unknown host with an empty staging DSN):
  // stay completely inert rather than throwing at startup.
  if (!enabled) return;

  initialized = true;

  initReactSentry({
    dsn,
    environment,
    release: APP_BUILD_SHA && APP_BUILD_SHA !== "dev" ? APP_BUILD_SHA : undefined,

    // --- Privacy posture -------------------------------------------------
    sendDefaultPii: false,
    // Session Replay is disabled: the integration is never added, and the
    // sample rates are pinned to 0 as belt-and-braces if one is ever added.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Drop the default browser integrations that attach request bodies or
    // full URLs with query strings.
    integrations: (defaults) =>
      defaults.filter((i) => i.name !== "Replay" && i.name !== "ReplayCanvas"),

    tracesSampleRate: environment === "production" ? 0.1 : 0,

    beforeSend: (event) => redactSentryEvent(event),
    beforeSendTransaction: (event) => redactSentryEvent(event),
    beforeBreadcrumb: (crumb) => {
      // console breadcrumbs routinely contain logged objects with student
      // data; drop the category outright.
      if (crumb.category === "console") return null;
      return crumb;
    },
  });
}

/** Exposed for the acceptance pass; not wired to any UI. */
export function captureSyntheticSentryTestEvent(label: string): string | undefined {
  if (!initialized) return undefined;
  return captureMessage(`synthetic-check:${label}`, "info");
}
