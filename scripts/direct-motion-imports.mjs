const MOTION_IMPORT_PATTERN =
  /import\s+(type\s+)?\{([^}]*)\}\s+from\s+(["'])motion\/react\3\s*;?/g;
const SPECIFIER_PATTERN =
  /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/;

export function rewriteMotionReactImports(source, directExports) {
  let rewrittenExports = 0;
  const code = source.replace(
    MOTION_IMPORT_PATTERN,
    (statement, wholeImportType, importsList) => {
      const importsByModule = new Map();
      const retainedTypeImports = [];

      for (const rawSpecifier of importsList.split(",")) {
        const specifier = rawSpecifier.trim();
        if (!specifier) continue;

        const isTypeOnly = Boolean(wholeImportType) || specifier.startsWith("type ");
        const normalizedSpecifier = specifier.replace(/^type\s+/, "");
        const specifierMatch = normalizedSpecifier.match(SPECIFIER_PATTERN);
        if (!specifierMatch) {
          throw new Error(`Unsupported Motion import specifier: ${specifier}`);
        }
        if (isTypeOnly) {
          retainedTypeImports.push(specifier);
          continue;
        }

        const [, importedName, localName = importedName] = specifierMatch;
        const directExport = directExports.get(importedName);
        if (!directExport) {
          throw new Error(`Motion runtime export ${importedName} has no reviewed direct module`);
        }
        const { moduleId, exportName } = directExport;
        if (
          !moduleId ||
          !SPECIFIER_PATTERN.test(exportName) ||
          !SPECIFIER_PATTERN.test(localName)
        ) {
          throw new Error(`Unsafe Motion direct export mapping for ${importedName}`);
        }

        const moduleImports = importsByModule.get(moduleId) ?? [];
        moduleImports.push(exportName === localName ? exportName : `${exportName} as ${localName}`);
        importsByModule.set(moduleId, moduleImports);
        rewrittenExports += 1;
      }

      if (importsByModule.size === 0) return statement;
      const retainedStatement = retainedTypeImports.length
        ? `import ${wholeImportType ?? ""}{ ${retainedTypeImports.join(", ")} } from "motion/react";`
        : "";
      const directStatements = [...importsByModule].map(
        ([moduleId, imports]) =>
          `import { ${imports.join(", ")} } from ${JSON.stringify(moduleId)};`,
      );
      return [retainedStatement, ...directStatements].filter(Boolean).join("\n");
    },
  );

  return { code, rewrittenExports };
}
