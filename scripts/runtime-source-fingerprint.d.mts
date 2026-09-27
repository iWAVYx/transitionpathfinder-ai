export type RuntimeSourceFingerprint = Readonly<{
  schema: string;
  algorithm: "sha256";
  fingerprint: string;
  fileCount: number;
}>;

export declare const RUNTIME_SOURCE_FINGERPRINT_SCHEMA: string;
export declare const RUNTIME_SOURCE_FINGERPRINT_ALGORITHM: "sha256";
export declare const RUNTIME_SOURCE_ENTRIES: readonly string[];

export declare function collectRuntimeSourceFiles(options?: {
  rootDirectory?: string;
  entries?: readonly string[];
}): string[];

export declare function createRuntimeSourceFingerprint(options?: {
  rootDirectory?: string;
  entries?: readonly string[];
}): RuntimeSourceFingerprint;

export declare function isRuntimeSourceFingerprint(value: unknown): value is string;

export declare function runtimeSourceParityErrors(input: {
  expectedFingerprint: unknown;
  actualFingerprint: unknown;
  schema: unknown;
  algorithm: unknown;
  fileCount: unknown;
}): string[];
