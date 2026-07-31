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
