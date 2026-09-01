const DATE_FNS_IMPORT_PATTERN =
  /import\s+(type\s+)?\{([^}]*)\}\s+from\s+(["'])date-fns\3\s*;?/g;
const DATE_FNS_EXPORT_PATTERN =
  /export \* from ["']\.\/([A-Za-z0-9]+\.js)["'];/g;
const SPECIFIER_PATTERN =
  /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/;

export function mapDateFnsModules(indexSource) {
  const modules = new Map();

  for (const match of indexSource.matchAll(DATE_FNS_EXPORT_PATTERN)) {
    const moduleFile = match[1];
    const exportName = moduleFile.slice(0, -3);
    const existingModule = modules.get(exportName);
    if (existingModule && existingModule !== moduleFile) {
      throw new Error(
        `Ambiguous date-fns export ${exportName}: ${existingModule}, ${moduleFile}`,
      );
    }
    modules.set(exportName, moduleFile);
  }

  return modules;
}

export function rewriteDateFnsImports(source, functionModules) {
  let rewrittenFunctions = 0;
  const code = source.replace(
    DATE_FNS_IMPORT_PATTERN,
    (statement, wholeImportType, importsList) => {
      const directImports = [];
      const retainedTypeImports = [];

      for (const rawSpecifier of importsList.split(",")) {
        const specifier = rawSpecifier.trim();
        if (!specifier) continue;

        const isTypeOnly = Boolean(wholeImportType) || specifier.startsWith("type ");
        const normalizedSpecifier = specifier.replace(/^type\s+/, "");
        const specifierMatch = normalizedSpecifier.match(SPECIFIER_PATTERN);
        if (!specifierMatch) {
          throw new Error(`Unsupported date-fns import specifier: ${specifier}`);
        }
        if (isTypeOnly) {
          retainedTypeImports.push(specifier);
          continue;
        }

        const [, importedName, localName = importedName] = specifierMatch;
        const moduleFile = functionModules.get(importedName);
        if (!moduleFile) {
          throw new Error(
            `date-fns runtime export ${importedName} is not a direct function module`,
          );
        }

        rewrittenFunctions += 1;
        const importedSpecifier =
          importedName === localName ? importedName : `${importedName} as ${localName}`;
        directImports.push(
          `import { ${importedSpecifier} } from "date-fns/${moduleFile.slice(0, -3)}";`,
        );
      }

      if (directImports.length === 0) return statement;
      const retainedStatement = retainedTypeImports.length
        ? `import ${wholeImportType ?? ""}{ ${retainedTypeImports.join(", ")} } from "date-fns";`
        : "";
      return [retainedStatement, ...directImports].filter(Boolean).join("\n");
    },
  );

  return { code, rewrittenFunctions };
}
