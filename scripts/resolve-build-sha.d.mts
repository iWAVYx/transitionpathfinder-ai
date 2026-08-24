export declare function normalizeBuildSha(value: string | undefined | null): string | undefined;

export declare function resolveBuildSha(options?: {
  environment?: Record<string, string | undefined>;
  runGit?: (command: string, args: string[], options: Record<string, unknown>) => string;
}): string;
