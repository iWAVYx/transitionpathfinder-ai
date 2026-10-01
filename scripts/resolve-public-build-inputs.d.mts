export type PaymentsEnvironment = "sandbox" | "live" | "unknown";

export interface PublicBuildEnvironment {
  VITE_SUPABASE_URL?: string;
  VITE_APP_ENV?: string;
  VITE_PAYMENTS_CLIENT_TOKEN?: string;
}

export function resolveLovableBuildAppEnv(input?: {
  runtimeEnv?: Record<string, string | undefined>;
  publicBuildEnv?: PublicBuildEnvironment;
}): string;

export interface PublicBuildInputs {
  viteAppEnv: string;
  paymentsClientToken: string;
  sandboxPaymentsClientToken: string;
  livePaymentsClientToken: string;
}

export function paymentsClientTokenMode(
  token: string | undefined | null,
): PaymentsEnvironment;

export function isIsolatedLovableStagingBuild(input?: {
  isLovableSandbox?: boolean;
  appEnv?: string;
  runtimeEnv?: Record<string, string | undefined>;
  publicBuildEnv?: PublicBuildEnvironment;
}): boolean;

export function resolvePublicBuildInputs(input?: {
  runtimeEnv?: Record<string, string | undefined>;
  publicBuildEnv?: PublicBuildEnvironment;
  sandboxPublicBuildEnv?: PublicBuildEnvironment;
  livePublicBuildEnv?: PublicBuildEnvironment;
  preferLiveBuildInputs?: boolean;
  stagingOnlyBuild?: boolean;
}): PublicBuildInputs;

export function assertLovablePublicBuildInputs(
  inputs: PublicBuildInputs,
  options?: {
    appEnv?: string;
    runtimePaymentsClientTokenMode?: PaymentsEnvironment;
    runtimePaymentsClientTokenPresent?: boolean;
    runtimeLivePaymentsClientTokenPresent?: boolean;
    stagingOnlyBuild?: boolean;
  },
): void;

export function paymentsEnvironmentForHostname(
  hostname: string | undefined | null,
  fallbackAppEnv?: string,
): PaymentsEnvironment;

export function selectPaymentsClientConfig(input?: {
  hostname?: string;
  fallbackAppEnv?: string;
  sandboxPaymentsClientToken?: string;
  livePaymentsClientToken?: string;
}): {
  environment: PaymentsEnvironment;
  clientToken: string;
};
