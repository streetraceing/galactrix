import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const chatSetupPath = new URL(
  '../../src/features/chats/components/ChatSetupModal.tsx',
  import.meta.url,
);
const chatModulesPath = new URL(
  '../../src/features/chats/components/ChatModuleOverrides.tsx',
  import.meta.url,
);
const galaxiesPath = new URL(
  '../../src/features/galaxies/GalaxiesScreen.tsx',
  import.meta.url,
);
const titlebarPath = new URL(
  '../../src/components/layout/DesktopTitlebar.tsx',
  import.meta.url,
);
const quickCreatePath = new URL(
  '../../src/lib/galaxyQuickCreate.ts',
  import.meta.url,
);
const modelsPath = new URL('../../src-tauri/src/models.rs', import.meta.url);
const generationPath = new URL(
  '../../src-tauri/src/generation_context.rs',
  import.meta.url,
);

test('chat settings expose focused sections and module overrides', async () => {
  const [setup, modules] = await Promise.all([
    readFile(chatSetupPath, 'utf8'),
    readFile(chatModulesPath, 'utf8'),
  ]);

  assert.match(setup, /<Tabs\.Tab id="general">/);
  assert.match(setup, /<Tabs\.Tab id="context">/);
  assert.match(setup, /<Tabs\.Tab id="modules">/);
  assert.match(setup, /<Tabs\.Tab id="prompt">/);
  assert.match(setup, /<ChatModuleOverridesPanel/);
  assert.match(setup, /value=\{form\.moduleOverrides\}/);
  assert.match(modules, /id: 'retry'/);
  assert.match(modules, /id: 'dynamicContext'/);
  assert.match(modules, /id: 'semanticMemory'/);
  assert.match(modules, /id: 'contextBudget'/);
  assert.match(modules, /id: 'repetitionGuard'/);
  assert.match(modules, /id: 'responseCleanup'/);
  assert.match(modules, /chatModules\.useGlobal/);
});

test('Galaxy quick create can target every library kind', async () => {
  const [galaxies, titlebar, quickCreate] = await Promise.all([
    readFile(galaxiesPath, 'utf8'),
    readFile(titlebarPath, 'utf8'),
    readFile(quickCreatePath, 'utf8'),
  ]);

  assert.match(galaxies, /<Dropdown\.Menu/);
  assert.match(galaxies, /galaxySections\.map/);
  assert.match(galaxies, /consumeGalaxyQuickCreate/);
  assert.match(galaxies, /setSection\(kind\)/);
  assert.match(galaxies, /onPress: \(\) => openCreate\(entry\.id\)/);
  assert.match(titlebar, /requestGalaxyQuickCreate\(kind\)/);
  assert.match(quickCreate, /let pendingRequest:/);
  assert.match(quickCreate, /subscribeGalaxyQuickCreate/);
  assert.match(
    titlebar,
    /\['style', 'desktopTitlebar\.createStyle', 'sparkles'\]/,
  );
  assert.match(
    titlebar,
    /\['prompt-set', 'desktopTitlebar\.createPromptSet', 'database'\]/,
  );
  assert.match(titlebar, /searchOnly: true/);
});

test('backend module overrides stay independent from global settings', async () => {
  const [models, generation] = await Promise.all([
    readFile(modelsPath, 'utf8'),
    readFile(generationPath, 'utf8'),
  ]);

  assert.match(models, /pub struct ChatModuleOverrides/);
  assert.match(models, /pub context_budget: Option<bool>/);
  assert.match(models, /pub repetition_guard: Option<bool>/);
  assert.match(models, /pub response_cleanup: Option<bool>/);
  assert.match(generation, /module_overrides\.retry_enabled/);
  assert.match(generation, /module_overrides\.dynamic_context_enabled/);
  assert.match(generation, /module_overrides\.semantic_memory_enabled/);
  assert.match(generation, /module_overrides\.context_budget_enabled/);
  assert.match(generation, /module_overrides\.repetition_guard_enabled/);
  assert.match(generation, /module_overrides\.response_cleanup_enabled/);
});
