export declare function mapLucideIconModules(barrelSource: string): Map<string, string>;

export declare function rewriteLucideReactImports(
  source: string,
  iconModules: ReadonlyMap<string, string>,
): {
  code: string;
  rewrittenIcons: number;
};
