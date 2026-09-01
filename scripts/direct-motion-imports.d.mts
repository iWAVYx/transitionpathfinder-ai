export type MotionDirectExport = {
  moduleId: string;
  exportName: string;
};

export declare function rewriteMotionReactImports(
  source: string,
  directExports: ReadonlyMap<string, MotionDirectExport>,
): {
  code: string;
  rewrittenExports: number;
};
