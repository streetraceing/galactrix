import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('first-run setup is persisted in settings and gates the app entry', async () => {
  const [db, settingsStorage, models, appState, router] = await Promise.all([
    read('src-tauri/src/db.rs'),
    read('src-tauri/src/db/settings.rs'),
    read('src-tauri/src/models.rs'),
    read('src/app/appState.ts'),
    read('src/app/AppScreenRouter.tsx'),
  ]);

  assert.match(
    db,
    /ensure_column\(\s*connection,\s*"app_settings",\s*"setup_complete"/,
  );
  assert.match(settingsStorage, /setup_complete = \?21/);
  assert.match(
    settingsStorage,
    /setup_complete: row\.get::<_, i64>\(20\)\? != 0/,
  );
  assert.match(models, /pub setup_complete: bool/);
  // Fresh installs start with the wizard; completing it flips the flag.
  assert.match(appState, /setupComplete: false/);
  assert.match(
    router,
    /!\s*snapshot\.settings\.setupComplete[\s\S]{0,80}SetupWizard/,
  );
});

test('the wizard reuses the provider editor and stays mobile-first', async () => {
  const [wizard, editorHook, editorModal, preferences] = await Promise.all([
    read('src/features/setup/SetupWizard.tsx'),
    read('src/features/telescope/useProviderEditor.ts'),
    read('src/features/telescope/components/ProviderEditorModal.tsx'),
    read('src/features/profile/components/ProfilePreferences.tsx'),
  ]);

  // The provider step is the proven editor flow, not a re-implementation.
  assert.match(wizard, /useProviderEditor\(\{/);
  assert.match(wizard, /<ProviderEditorModal/);
  // Single column, full-width actions, 44px inputs on phones.
  assert.match(wizard, /grid grid-cols-1 gap-2 sm:grid-cols-3/);
  assert.match(wizard, /variant="primary"\s*\n?\s*fullWidth/);
  assert.match(wizard, /min-h-11 w-full/);
  // Completing or skipping both persist setupComplete.
  assert.match(wizard, /setupComplete: true/);
  // The wizard can be reopened from settings.
  assert.match(preferences, /setupComplete: false/);
});

test('the setup namespace is registered and localized in both locales', async () => {
  const [resources, en, ru] = await Promise.all([
    read('src/i18n/resources.ts'),
    read('src/i18n/locales/en/setup.json'),
    read('src/i18n/locales/ru/setup.json'),
  ]);

  assert.match(resources, /'setup'/);
  assert.match(resources, /setup: enSetup/);
  assert.match(resources, /setup: ruSetup/);
  const enCatalog: Record<string, string> = JSON.parse(en);
  const ruCatalog: Record<string, string> = JSON.parse(ru);
  for (const key of [
    'title',
    'welcome.title',
    'provider.connect',
    'embeddings.enable',
    'ready.start',
    'actions.skipAll',
  ]) {
    assert.ok(enCatalog[key], `en is missing ${key}`);
    assert.ok(ruCatalog[key], `ru is missing ${key}`);
  }
});
