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

export function collectLucideRuntimeExports(source, iconModules) {
  const exports = new Set();

  for (const match of source.matchAll(LUCIDE_IMPORT_PATTERN)) {
    const [, wholeImportType, importsList] = match;
    for (const rawSpecifier of importsList.split(",")) {
      const specifier = rawSpecifier.trim();
      if (!specifier || wholeImportType || specifier.startsWith("type ")) continue;
      const specifierMatch = specifier.match(SPECIFIER_PATTERN);
      if (!specifierMatch) {
        throw new Error(`Unsupported Lucide import specifier: ${specifier}`);
      }
      const importedName = specifierMatch[1];
      if (!iconModules.has(importedName)) {
        throw new Error(`Lucide runtime export ${importedName} is not an icon module`);
      }
      exports.add(importedName);
    }
  }

  return exports;
}

export function rewriteLucideReactImportsFromBundle(source, iconModules, bundleId) {
  let rewrittenIcons = 0;
  const code = source.replace(
    LUCIDE_IMPORT_PATTERN,
    (statement, wholeImportType, importsList) => {
      const bundledImports = [];
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
        if (!iconModules.has(importedName)) {
          throw new Error(`Lucide runtime export ${importedName} is not an icon module`);
        }
        bundledImports.push(
          importedName === localName ? importedName : `${importedName} as ${localName}`,
        );
        rewrittenIcons += 1;
      }

      if (bundledImports.length === 0) return statement;
      const retainedStatement = retainedTypeImports.length
        ? `import ${wholeImportType ?? ""}{ ${retainedTypeImports.join(", ")} } from "lucide-react";`
        : "";
      const bundledStatement = `import { ${bundledImports.join(", ")} } from ${JSON.stringify(bundleId)};`;
      return [retainedStatement, bundledStatement].filter(Boolean).join("\n");
    },
  );

  return { code, rewrittenIcons };
}

export function createLucideIconBundle(exportNames, iconModules, readIconModule) {
  const exportsByModule = new Map();
  for (const exportName of [...exportNames].sort()) {
    if (!IDENTIFIER_PATTERN.test(exportName)) {
      throw new Error(`Unsafe Lucide bundle export: ${exportName}`);
    }
    const iconModule = iconModules.get(exportName);
    if (!iconModule) {
      throw new Error(`Lucide bundle export ${exportName} is not mapped`);
    }
    const moduleExports = exportsByModule.get(iconModule) ?? [];
    moduleExports.push(exportName);
    exportsByModule.set(iconModule, moduleExports);
  }

  const declarations = [];
  const exports = [];
  let moduleIndex = 0;
  for (const [iconModule, moduleExports] of exportsByModule) {
    const iconSource = readIconModule(iconModule);
    const iconMatch = iconSource.match(
      /const __iconNode = ([\s\S]*?);\r?\nconst [A-Za-z_$][\w$]* = createLucideIcon\((["'])([^"']+)\2, __iconNode\);/,
    );
    if (!iconMatch) {
      throw new Error(`Could not extract Lucide icon data from ${iconModule}`);
    }
    const componentName = `__TransitionForwardLucide${moduleIndex}`;
    declarations.push(
      `const ${componentName} = createLucideIcon(${JSON.stringify(iconMatch[3])}, ${iconMatch[1]});`,
    );
    for (const exportName of moduleExports) {
      exports.push(`${componentName} as ${exportName}`);
    }
    moduleIndex += 1;
  }

  if (moduleIndex < 100) {
    throw new Error(`Expected at least 100 used Lucide icon modules, found ${moduleIndex}`);
  }

  return [
    'import createLucideIcon from "lucide-react/dist/esm/createLucideIcon.js";',
    ...declarations,
    `export { ${exports.join(", ")} };`,
  ].join("\n");
}
