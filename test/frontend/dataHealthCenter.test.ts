import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  formatByteSize,
  HEALTH_ISSUE_KEYS,
  HEALTH_TABLE_KEYS,
  HEALTH_UNIT_KEYS,
} from '../../src/features/settings/dataHealth';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('database diagnostics run integrity, foreign-key and drift checks', async () => {
  const [health, models] = await Promise.all([
    read('src-tauri/src/db/health.rs'),
    read('src-tauri/src/models.rs'),
  ]);

  assert.match(health, /PRAGMA integrity_check/);
  assert.match(health, /PRAGMA foreign_key_check/);
  assert.match(health, /unchecked_transaction/);
  assert.match(health, /transaction\.commit\(\)/);
  assert.match(
    health,
    /build_health_report\(connection, database_path, app_version\)/,
  );
  assert.match(models, /pub struct DatabaseHealthReport/);
  assert.match(models, /pub struct HealthRepairReport/);
  // The report carries counters and identifiers, never message content.
  const reportStruct = models.slice(
    models.indexOf('pub struct DatabaseHealthReport'),
    models.indexOf('pub struct HealthRepairAction'),
  );
  assert.doesNotMatch(reportStruct, /content/);
});

test('repair is guarded against active generations and exposed through the command boundary', async () => {
  const [lib, backend, controller, router, screen] = await Promise.all([
    read('src-tauri/src/lib.rs'),
    read('src/lib/backend.ts'),
    read('src/app/useAppController.ts'),
    read('src/app/AppScreenRouter.tsx'),
    read('src/features/settings/SettingsScreen.tsx'),
  ]);

  assert.match(lib, /fn run_database_diagnostics/);
  assert.match(lib, /fn repair_database_issues/);
  assert.match(
    lib,
    /repair_database_issues[\s\S]{0,220}keys::HEALTH_ACTIVE_GENERATION/,
  );
  assert.match(lib, /run_database_diagnostics,\s*\n\s*repair_database_issues,/);
  assert.match(
    backend,
    /invokeBackend<DatabaseHealthReport>\('run_database_diagnostics'\)/,
  );
  assert.match(
    backend,
    /invokeBackend<HealthRepairReport>\('repair_database_issues'\)/,
  );
  assert.match(controller, /runHealthDiagnostics/);
  assert.match(controller, /repairHealthIssues/);
  assert.match(router, /onRunDiagnostics=\{controller\.runHealthDiagnostics\}/);
  assert.match(router, /onRepairIssues=\{controller\.repairHealthIssues\}/);
  assert.match(screen, /DataHealthCenter/);
  assert.match(screen, /id: 'health'/);
});

test('every health issue id has localized titles and descriptions in both locales', async () => {
  const [en, ru] = await Promise.all([
    read('src/i18n/locales/en/settings.json'),
    read('src/i18n/locales/ru/settings.json'),
  ]);
  const enCatalog: Record<string, string> = JSON.parse(en);
  const ruCatalog: Record<string, string> = JSON.parse(ru);

  for (const [issueId, keys] of Object.entries(HEALTH_ISSUE_KEYS)) {
    for (const key of [keys.title, keys.description]) {
      assert.ok(enCatalog[key], `en is missing ${key} for ${issueId}`);
      assert.ok(ruCatalog[key], `ru is missing ${key} for ${issueId}`);
      assert.ok(enCatalog[key].trim().length > 0);
      assert.ok(ruCatalog[key].trim().length > 0);
    }
  }

  for (const tableKey of Object.values(HEALTH_TABLE_KEYS)) {
    assert.ok(enCatalog[tableKey], `en is missing ${tableKey}`);
    assert.ok(ruCatalog[tableKey], `ru is missing ${tableKey}`);
  }

  for (const unitKey of Object.values(HEALTH_UNIT_KEYS)) {
    assert.ok(enCatalog[unitKey], `en is missing ${unitKey}`);
    assert.ok(ruCatalog[unitKey], `ru is missing ${unitKey}`);
  }
});

test('byte sizes scale through fixed units without locale dependence', () => {
  assert.deepEqual(formatByteSize(0), { value: '0', unit: 'byte' });
  assert.deepEqual(formatByteSize(512), { value: '512', unit: 'byte' });
  assert.deepEqual(formatByteSize(1024), { value: '1.0', unit: 'kilobyte' });
  assert.deepEqual(formatByteSize(1536), { value: '1.5', unit: 'kilobyte' });
  assert.deepEqual(formatByteSize(5 * 1024 * 1024), {
    value: '5.0',
    unit: 'megabyte',
  });
  assert.equal(formatByteSize(3 * 1024 ** 4).unit, 'terabyte');
});
