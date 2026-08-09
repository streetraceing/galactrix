import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

type TranslationResource = Record<string, unknown>;

const localeRoot = path.join(process.cwd(), 'src', 'i18n', 'locales');
const referenceLocale = 'en';
const locales = readdirSync(localeRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const errors: string[] = [];

function readNamespace(locale: string, fileName: string): TranslationResource {
  const filePath = path.join(localeRoot, locale, fileName);
  const resource: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!resource || typeof resource !== 'object' || Array.isArray(resource)) {
    throw new Error(`${locale}/${fileName}: namespace must be an object`);
  }
  return resource as TranslationResource;
}

function variables(message: unknown) {
  if (typeof message !== 'string') return [];
  return [...message.matchAll(/\{\{\s*-?\s*(\w+)\s*\}\}/gu)]
    .map((match) => match[1])
    .sort();
}

const pluralSuffix = /_(zero|one|two|few|many|other)$/u;

function canonicalKey(key: string) {
  return key.replace(pluralSuffix, '');
}

function groupKeys(keys: string[]) {
  const groups = new Map<string, string[]>();
  for (const key of keys) {
    const canonical = canonicalKey(key);
    groups.set(canonical, [...(groups.get(canonical) ?? []), key]);
  }
  return groups;
}

function resourceHasKey(namespace: string, key: string) {
  const resource = referenceResources[namespace];
  if (!resource) return false;
  const canonical = canonicalKey(key);
  return Object.keys(resource).some(
    (candidate) => canonicalKey(candidate) === canonical,
  );
}

function translationNamespaces(source: string) {
  const match = source.match(/useTranslation\(\s*([^)]*)\)/u);
  if (!match) return [];
  const argument = match[1].trim();
  if (!argument) return ['common'];
  return [...argument.matchAll(/['"]([^'"]+)['"]/gu)].map(
    (candidate) => candidate[1],
  );
}

function callNamespace(options: string, fallbackNamespaces: string[]) {
  const explicit = options.match(/\bns\s*:\s*['"]([^'"]+)['"]/u)?.[1];
  return explicit ? [explicit] : fallbackNamespaces;
}

const referenceFiles = readdirSync(path.join(localeRoot, referenceLocale))
  .filter((fileName) => fileName.endsWith('.json'))
  .sort();
const referenceResources: Record<string, TranslationResource> =
  Object.fromEntries(
    referenceFiles.map((fileName) => [
      fileName.replace(/\.json$/u, ''),
      readNamespace(referenceLocale, fileName),
    ]),
  );

for (const [namespace, resource] of Object.entries(referenceResources)) {
  if (Object.keys(resource).length === 0) {
    errors.push(`${referenceLocale}/${namespace}: namespace is empty`);
  }
  for (const [key, message] of Object.entries(resource)) {
    if (typeof message !== 'string') {
      errors.push(`${referenceLocale}/${namespace}:${key}: must be a string`);
    } else if (!message.trim()) {
      errors.push(`${referenceLocale}/${namespace}:${key}: is empty`);
    }
  }
}

for (const locale of locales) {
  const localeFiles = readdirSync(path.join(localeRoot, locale))
    .filter((fileName) => fileName.endsWith('.json'))
    .sort();

  for (const missingFile of referenceFiles.filter(
    (fileName) => !localeFiles.includes(fileName),
  )) {
    errors.push(`${locale}: missing namespace ${missingFile}`);
  }
  for (const extraFile of localeFiles.filter(
    (fileName) => !referenceFiles.includes(fileName),
  )) {
    errors.push(`${locale}: unexpected namespace ${extraFile}`);
  }

  for (const fileName of referenceFiles) {
    if (!localeFiles.includes(fileName)) continue;
    const reference = readNamespace(referenceLocale, fileName);
    const resource = readNamespace(locale, fileName);
    const referenceGroups = groupKeys(Object.keys(reference).sort());
    const resourceGroups = groupKeys(Object.keys(resource).sort());

    for (const [key, message] of Object.entries(resource)) {
      if (typeof message !== 'string') {
        errors.push(`${locale}/${fileName}:${key}: must be a string`);
      } else if (!message.trim()) {
        errors.push(`${locale}/${fileName}:${key}: is empty`);
      }
    }

    for (const key of [...referenceGroups.keys()].filter(
      (candidate) => !resourceGroups.has(candidate),
    )) {
      errors.push(`${locale}/${fileName}: missing key ${key}`);
    }
    for (const key of [...resourceGroups.keys()].filter(
      (candidate) => !referenceGroups.has(candidate),
    )) {
      errors.push(`${locale}/${fileName}: unexpected key ${key}`);
    }

    for (const [canonical, expectedKeys] of referenceGroups) {
      const actualKeys = resourceGroups.get(canonical);
      if (!actualKeys) continue;
      const pluralized = expectedKeys.some((key) => pluralSuffix.test(key));
      if (pluralized) {
        const categories = new Intl.PluralRules(locale).resolvedOptions()
          .pluralCategories;
        for (const category of categories) {
          if (!actualKeys.includes(`${canonical}_${category}`)) {
            errors.push(
              `${locale}/${fileName}: missing ${canonical}_${category}`,
            );
          }
        }
      }

      const expectedVariables = [
        ...new Set(expectedKeys.flatMap((key) => variables(reference[key]))),
      ].sort();
      for (const key of actualKeys) {
        const actualVariables = variables(resource[key]);
        if (expectedVariables.join('|') !== actualVariables.join('|')) {
          errors.push(
            `${locale}/${fileName}:${key}: variables differ (${actualVariables.join(', ')} vs ${expectedVariables.join(', ')})`,
          );
        }
      }
    }
  }
}

for (const fileName of referenceFiles) {
  const resource = readNamespace(referenceLocale, fileName);
  for (const [key, message] of Object.entries(resource)) {
    if (typeof message === 'string' && /[\u0400-\u04ff]/u.test(message)) {
      errors.push(`${referenceLocale}/${fileName}:${key}: contains Cyrillic`);
    }
  }
}

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

const sourceFiles = walk(path.join(process.cwd(), 'src')).filter((filePath) =>
  /\.tsx?$/u.test(filePath),
);

for (const filePath of sourceFiles) {
  const source = readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.tsx') && /[\u0400-\u04ff]/u.test(source)) {
    errors.push(
      `${path.relative(process.cwd(), filePath)}: contains untranslated Cyrillic UI text`,
    );
  }
  const defaultNamespaces = translationNamespaces(source);
  for (const match of source.matchAll(
    /i18next\.t\(\s*['"]([^'"]+)['"]([\s\S]*?)\)/gu,
  )) {
    const [, key, options] = match;
    const namespaces = callNamespace(options, ['common']);
    if (!namespaces.some((namespace) => resourceHasKey(namespace, key))) {
      errors.push(
        `${path.relative(process.cwd(), filePath)}: unknown ${namespaces.join('|')} key ${key}`,
      );
    }
  }
  for (const match of source.matchAll(
    /(?<![\w.])t\(\s*['"]([^'"]+)['"]([\s\S]*?)\)/gu,
  )) {
    const [, key, options] = match;
    const namespaces = callNamespace(
      options,
      defaultNamespaces.length ? defaultNamespaces : ['common'],
    );
    if (!namespaces.some((namespace) => resourceHasKey(namespace, key))) {
      errors.push(
        `${path.relative(process.cwd(), filePath)}: unknown ${namespaces.join('|')} key ${key}`,
      );
    }
  }
  for (const match of source.matchAll(
    /translate\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/gu,
  )) {
    const [, namespace, rawKey] = match;
    const key = canonicalKey(rawKey);
    const resource = referenceResources[namespace];
    if (!resource || !Object.keys(resource).map(canonicalKey).includes(key)) {
      errors.push(
        `${path.relative(process.cwd(), filePath)}: unknown ${namespace} key ${rawKey}`,
      );
    }
  }
}

const rustI18nPath = path.join(process.cwd(), 'src-tauri', 'src', 'i18n.rs');
if (existsSync(rustI18nPath)) {
  const rustI18n = readFileSync(rustI18nPath, 'utf8');
  const backendKeys = new Set(
    Object.keys(referenceResources.backend ?? {}).map(canonicalKey),
  );
  for (const match of rustI18n.matchAll(
    /pub const\s+\w+\s*:\s*&str\s*=\s*"(backend\.[^"]+)"/gu,
  )) {
    const key = canonicalKey(match[1]);
    if (!backendKeys.has(key)) {
      errors.push(`src-tauri/src/i18n.rs: unknown backend key ${match[1]}`);
    }
  }

  const keyedBackendFiles = [
    'db.rs',
    'lib.rs',
    'provider_client.rs',
    'secure_storage.rs',
  ];
  for (const fileName of keyedBackendFiles) {
    const filePath = path.join(process.cwd(), 'src-tauri', 'src', fileName);
    const source = readFileSync(filePath, 'utf8');
    if (/\bErr\(\s*"/gu.test(source)) {
      errors.push(
        `src-tauri/src/${fileName}: contains a direct string error instead of CommandError key`,
      );
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `i18n resources are consistent: ${locales.length} locales, ${referenceFiles.length} namespaces`,
  );
}
