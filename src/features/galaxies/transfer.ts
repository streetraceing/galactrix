import type { GalaxyItem, GalaxyItemInput, GalaxyKind } from '../../types';
import { i18next } from '../../i18n';
import { normalizeData } from './model';

const GALAXY_KINDS: GalaxyKind[] = [
  'persona',
  'character',
  'universe',
  'worldbook',
  'style',
  'prompt-set',
];

export type GalaxiesExport = {
  format: 'galactrix.galaxies';
  version: 1;
  exportedAt: string;
  items: GalaxyItemInput[];
};

export function createGalaxiesExport(items: GalaxyItem[]): GalaxiesExport {
  return {
    format: 'galactrix.galaxies',
    version: 1,
    exportedAt: new Date().toISOString(),
    items: items.map((item) => ({
      id: item.id,
      kind: item.kind,
      name: item.name,
      description: item.description,
      data: normalizeData(item.kind, item.data),
    })),
  };
}

export function parseGalaxiesExport(value: unknown): GalaxyItemInput[] {
  const bundle = objectValue(value);
  if (
    bundle.format !== 'galactrix.galaxies' ||
    bundle.version !== 1 ||
    !Array.isArray(bundle.items)
  ) {
    throw new Error(i18next.t('errors.notGalaxyExport', { ns: 'galaxies' }));
  }

  return bundle.items
    .map((raw, index) => {
      const item = objectValue(raw);
      const kind = stringValue(item.kind) as GalaxyKind;
      const name = stringValue(item.name).trim();
      if (!GALAXY_KINDS.includes(kind) || !name) {
        throw new Error(
          i18next.t('errors.invalidExportItem', {
            ns: 'galaxies',
            row: index + 1,
          }),
        );
      }
      return {
        id: stringValue(item.id) || undefined,
        kind,
        name,
        description: stringValue(item.description),
        data: normalizeData(kind, objectValue(item.data)),
      };
    })
    .sort(
      (left, right) => importPriority(left.kind) - importPriority(right.kind),
    );
}

function importPriority(kind: GalaxyKind) {
  if (kind === 'style' || kind === 'prompt-set') return 0;
  if (kind === 'character') return 2;
  return 1;
}

function objectValue(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}
