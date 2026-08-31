const LUCIDE_IMPORT_PATTERN =
  /import\s+(type\s+)?\{([^}]*)\}\s+from\s+(["'])lucide-react\3\s*;?/g;
const LUCIDE_EXPORT_PATTERN =
  /export \{([^}]+)\} from ["']\.\/icons\/([^"']+\.js)["'];/g;
const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;
const SPECIFIER_PATTERN =
  /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/;

export function mapLucideIconModules(barrelSource) {
  const iconModules = new Map();

  for (const match of barrelSource.matchAll(LUCIDE_EXPORT_PATTERN)) {
    const [, exportsList, iconModule] = match;
    for (const exportMatch of exportsList.matchAll(/default as ([A-Za-z_$][\w$]*)/g)) {
      const exportName = exportMatch[1];
      if (!IDENTIFIER_PATTERN.test(exportName) || !/^[a-z0-9-]+\.js$/i.test(iconModule)) {
        throw new Error(`Unsafe Lucide icon export mapping: ${exportName} -> ${iconModule}`);
      }

      const existingModule = iconModules.get(exportName);
      if (existingModule && existingModule !== iconModule) {
        throw new Error(
          `Ambiguous Lucide icon export ${exportName}: ${existingModule}, ${iconModule}`,
        );
      }
      iconModules.set(exportName, iconModule);
    }
  }

  return iconModules;
}

export function rewriteLucideReactImports(source, iconModules) {
  let rewrittenIcons = 0;
  const code = source.replace(
    LUCIDE_IMPORT_PATTERN,
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
          throw new Error(`Unsupported Lucide import specifier: ${specifier}`);
        }
        if (isTypeOnly) {
          retainedTypeImports.push(specifier);
          continue;
        }

        const [, importedName, localName = importedName] = specifierMatch;
        const iconModule = iconModules.get(importedName);
        if (!iconModule) {
          throw new Error(
            `Lucide runtime export ${importedName} is not a direct icon module`,
          );
        }

        rewrittenIcons += 1;
        directImports.push(
          `import ${localName} from "lucide-react/dist/esm/icons/${iconModule}";`,
        );
      }

      if (directImports.length === 0) return statement;
      const retainedStatement = retainedTypeImports.length
        ? `import ${wholeImportType ?? ""}{ ${retainedTypeImports.join(", ")} } from "lucide-react";`
        : "";
      return [retainedStatement, ...directImports].filter(Boolean).join("\n");
    },
  );

  return { code, rewrittenIcons };
}
