export function mapDateFnsModules(indexSource: string): Map<string, string>;

export function rewriteDateFnsImports(
  source: string,
  functionModules: ReadonlyMap<string, string>,
): { code: string; rewrittenFunctions: number };
