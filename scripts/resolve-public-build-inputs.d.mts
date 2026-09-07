export type PaymentsEnvironment = "sandbox" | "live" | "unknown";

export interface PublicBuildEnvironment {
  VITE_APP_ENV?: string;
  VITE_PAYMENTS_CLIENT_TOKEN?: string;
}

export interface PublicBuildInputs {
  viteAppEnv: string;
  paymentsClientToken: string;
  sandboxPaymentsClientToken: string;
  livePaymentsClientToken: string;
}

export function paymentsClientTokenMode(
  token: string | undefined | null,
): PaymentsEnvironment;

export function resolvePublicBuildInputs(input?: {
  runtimeEnv?: Record<string, string | undefined>;
  publicBuildEnv?: PublicBuildEnvironment;
  sandboxPublicBuildEnv?: PublicBuildEnvironment;
  livePublicBuildEnv?: PublicBuildEnvironment;
}): PublicBuildInputs;

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
