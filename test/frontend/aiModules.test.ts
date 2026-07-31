import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const controllerPath = new URL(
  '../../src/hooks/useAppController.ts',
  import.meta.url,
);
const settingsPath = new URL(
  '../../src/features/settings/SettingsScreen.tsx',
  import.meta.url,
);
const moduleCardPath = new URL(
  '../../src/features/settings/components/ModuleFields.tsx',
  import.meta.url,
);
const telescopeTransferPath = new URL(
  '../../src/features/telescope/transfer.ts',
  import.meta.url,
);
const backendPath = new URL('../../src/lib/backend.ts', import.meta.url);

test('new AI modules are backward-compatible and independently configurable', async () => {
  const [controller, settings] = await Promise.all([
    readFile(controllerPath, 'utf8'),
    readFile(settingsPath, 'utf8'),
  ]);

  assert.match(
    controller,
    /retry:\s*\{[\s\S]*enabled: true[\s\S]*maxAttempts: 3/,
  );
  assert.match(controller, /dynamicContext:\s*\{[\s\S]*enabled: false/);
  assert.match(controller, /semanticMemory:\s*\{[\s\S]*enabled: false/);
  assert.match(settings, /<AiModulesSettings/);
  assert.match(settings, /providers=\{providers\}/);
});

test('settings separate parameters and independently collapsible modules', async () => {
  const [settings, moduleCard] = await Promise.all([
    readFile(settingsPath, 'utf8'),
    readFile(moduleCardPath, 'utf8'),
  ]);

  assert.match(settings, /useState<SettingsSection>\('parameters'\)/);
  assert.match(settings, /<Tabs\.Tab id=\"parameters\">/);
  assert.match(settings, /<Tabs\.Tab id=\"modules\">/);
  assert.match(
    settings,
    /<Tabs\.Panel id=\"parameters\"[\s\S]*<ProfilePreferences/,
  );
  assert.match(
    settings,
    /<Tabs\.Panel id=\"modules\"[\s\S]*<AiModulesSettings/,
  );
  assert.match(moduleCard, /useState\(true\)/);
  assert.match(moduleCard, /aria-expanded=\{isExpanded\}/);
  assert.match(moduleCard, /showDescription=\{isExpanded\}/);
  assert.match(moduleCard, /hidden=\{!isExpanded \|\| !enabled\}/);
  assert.doesNotMatch(moduleCard, /Accordion|DisclosureGroup/);
});

test('embedding capability survives Telescope export and has a backend probe', async () => {
  const [transfer, backend] = await Promise.all([
    readFile(telescopeTransferPath, 'utf8'),
    readFile(backendPath, 'utf8'),
  ]);

  assert.match(
    transfer,
    /embeddingModel: optionalString\(provider\.embeddingModel\)/,
  );
  assert.match(
    transfer,
    /embeddingBaseUrl: optionalString\(provider\.embeddingBaseUrl\)/,
  );
  assert.match(backend, /test_provider_embeddings/);
});
