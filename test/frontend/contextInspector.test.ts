import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  INSPECTOR_SECTION_KEYS as SECTION_LABEL_KEYS,
  INSPECTOR_TRUNCATION_KEYS as TRUNCATION_LABEL_KEYS,
  INSPECTOR_REASON_KEYS as OMITTED_REASON_KEYS,
  INSPECTOR_CLEANUP_KEYS as CLEANUP_LABEL_KEYS,
  INSPECTOR_MODE_KEYS as MODE_LABEL_KEYS,
} from '../../src/features/chats/contextReport';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('generation reports are composed during context preparation and persisted per variant', async () => {
  const [models, generationContext, promptBuilder, lib, db, backup] =
    await Promise.all([
      read('src-tauri/src/models.rs'),
      read('src-tauri/src/generation_context.rs'),
      read('src-tauri/src/prompt_builder.rs'),
      read('src-tauri/src/lib.rs'),
      read('src-tauri/src/db.rs'),
      read('src-tauri/src/db/backup.rs'),
    ]);

  assert.match(models, /pub struct GenerationReport/);
  assert.match(models, /pub report: Option<GenerationReport>/);
  assert.match(generationContext, /mode: GenerationMode/);
  assert.match(generationContext, /push_truncation\("recentMessageLimit"/);
  assert.match(generationContext, /push_truncation\("contextBudget"/);
  assert.match(generationContext, /push_truncation\("dynamicContext"/);
  assert.match(generationContext, /active_prompt_rules/);
  assert.match(promptBuilder, /pub fn build_system_prompt_with_report/);
  assert.match(promptBuilder, /Some\("contextBudget".to_owned\(\)\)/);
  // Every generation path persists the report against the produced variant.
  assert.match(lib, /fn finalize_report/);
  assert.match(lib, /finalize_report\(report, &completion\)/);
  assert.match(lib, /GenerationMode::Regenerate/);
  assert.match(lib, /GenerationMode::Continue/);
  assert.match(lib, /GenerationMode::Send/);
  assert.match(
    db,
    /ensure_column\(connection, "message_variants", "report_json"/,
  );
  assert.match(backup, /report_json/);
});

test('the inspector surfaces the report from the active variant', async () => {
  const [types, messageList, modal] = await Promise.all([
    read('src/types.ts'),
    read('src/features/chats/components/MessageList.tsx'),
    read('src/features/chats/components/MessageContextInspectorModal.tsx'),
  ]);

  assert.match(types, /report\?: ContextReport/);
  assert.match(types, /export type ContextReport = \{/);
  assert.match(
    messageList,
    /MessageContextInspectorModal\s+message=\{inspectMessage\}/,
  );
  assert.match(messageList, /onInspectRequest=\{inspect\}/);
  assert.match(modal, /variant\.index === message\.activeVariantIndex/);
});

test('every inspector label map points at localized keys in both locales', async () => {
  const [en, ru] = await Promise.all([
    read('src/i18n/locales/en/chats.json'),
    read('src/i18n/locales/ru/chats.json'),
  ]);
  const enCatalog: Record<string, string> = JSON.parse(en);
  const ruCatalog: Record<string, string> = JSON.parse(ru);

  const keyGroups = [
    ...Object.values(SECTION_LABEL_KEYS),
    ...Object.values(TRUNCATION_LABEL_KEYS),
    ...Object.values(OMITTED_REASON_KEYS),
    ...Object.values(CLEANUP_LABEL_KEYS),
    ...Object.values(MODE_LABEL_KEYS),
    'inspector.title',
    'inspector.noReport',
    'inspector.estimatedTokens',
    'inspector.reportedTokens',
    'inspector.usageNotReported',
    'inspector.latencyMs',
    'inspector.estimateBreakdown',
    'inspector.reportedHint',
    'inspector.historyIntact',
    'inspector.module.dynamicContext',
    'inspector.module.semanticMemory',
    'inspector.module.repetitionGuard',
    'inspector.module.responseCleanup',
    'inspector.module.on',
    'inspector.module.off',
  ];
  for (const key of keyGroups) {
    assert.ok(enCatalog[key], `en is missing ${key}`);
    assert.ok(ruCatalog[key], `ru is missing ${key}`);
  }

  const pluralGroup = Object.keys(enCatalog).filter((key) =>
    key.startsWith('inspector.module.semanticMemorySelected'),
  );
  assert.ok(pluralGroup.length >= 2, 'selected-count label must be pluralized');
});
