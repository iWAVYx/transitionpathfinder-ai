export declare function mapLucideIconModules(barrelSource: string): Map<string, string>;

export declare function rewriteLucideReactImports(
  source: string,
  iconModules: ReadonlyMap<string, string>,
): {
  code: string;
  rewrittenIcons: number;
};

export declare function collectLucideRuntimeExports(
  source: string,
  iconModules: ReadonlyMap<string, string>,
): Set<string>;

export declare function rewriteLucideReactImportsFromBundle(
  source: string,
  iconModules: ReadonlyMap<string, string>,
  bundleId: string,
): {
  code: string;
  rewrittenIcons: number;
};

export declare function createLucideIconBundle(
  exportNames: Iterable<string>,
  iconModules: ReadonlyMap<string, string>,
  readIconModule: (iconModule: string) => string,
): string;
