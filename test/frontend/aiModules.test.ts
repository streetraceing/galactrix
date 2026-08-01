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
const modulesPath = new URL(
  '../../src/features/settings/components/AiModulesSettings.tsx',
  import.meta.url,
);
const sidebarPath = new URL(
  '../../src/components/layout/DesktopSidebar.tsx',
  import.meta.url,
);
const framePath = new URL(
  '../../src/components/layout/ApplicationFrame.tsx',
  import.meta.url,
);
const resizeHandlePath = new URL(
  '../../src/components/ResizeHandle.tsx',
  import.meta.url,
);
const appCssPath = new URL('../../src/App.css', import.meta.url);
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

test('settings separate parameters and animated searchable modules', async () => {
  const [settings, moduleCard, modules] = await Promise.all([
    readFile(settingsPath, 'utf8'),
    readFile(moduleCardPath, 'utf8'),
    readFile(modulesPath, 'utf8'),
  ]);

  assert.match(settings, /useState<SettingsSection>\('parameters'\)/);
  assert.match(settings, /<Tabs\.Tab id="parameters">/);
  assert.match(settings, /<Tabs\.Tab id="modules">/);
  assert.match(
    settings,
    /<Tabs\.Panel id="parameters"[\s\S]*<ProfilePreferences/,
  );
  assert.match(settings, /<Tabs\.Panel id="modules"[\s\S]*<AiModulesSettings/);
  assert.match(moduleCard, /useState\(enabled\)/);
  assert.match(moduleCard, /const detailsVisible = enabled && isExpanded/);
  assert.match(moduleCard, /setIsExpanded\(nextEnabled\)/);
  assert.match(moduleCard, /showDescription=\{detailsVisible\}/);
  assert.match(moduleCard, /grid-rows-\[1fr\]/);
  assert.match(moduleCard, /grid-rows-\[0fr\]/);
  assert.match(moduleCard, /inert=\{!detailsVisible\}/);
  assert.match(modules, /<SearchField/);
  assert.match(modules, /ai\.modules\.search/);
  assert.match(modules, /visibleModuleIds/);
  assert.match(
    modules,
    /hidden=\{!visibleModuleIds\.has\('dynamicContext'\)\}/,
  );
  assert.match(modules, /ai\.modules\.noResults/);
  assert.doesNotMatch(moduleCard, /Accordion|DisclosureGroup/);
});

test('desktop sidebar keeps centered compact icons and reversible resize collapse', async () => {
  const [sidebar, frame, resizeHandle, appCss] = await Promise.all([
    readFile(sidebarPath, 'utf8'),
    readFile(framePath, 'utf8'),
    readFile(resizeHandlePath, 'utf8'),
    readFile(appCssPath, 'utf8'),
  ]);

  assert.match(sidebar, /compact \? 'w-14' : ''/);
  assert.match(sidebar, /group-data-\[collapsed=true\]\/sidebar:px-2/);
  assert.match(sidebar, /transition-\[width\]/);
  assert.match(sidebar, /after:w-px after:bg-separator/);
  assert.match(
    frame,
    /\{!isMobile && !hideDesktopNavigation \? \([\s\S]*<ResizeHandle/,
  );
  assert.match(frame, /collapsed=\{settings\.sidebarCollapsed\}/);
  assert.match(frame, /collapsedValue=\{DESKTOP_SIDEBAR_COLLAPSED_WIDTH\}/);
  assert.match(frame, /collapseThreshold=\{48\}/);
  assert.match(frame, /className="max-\[920px\]:hidden"/);
  assert.match(frame, /sidebarCollapsed: false/);
  assert.match(frame, /onCollapse=\{\(\) =>/);
  assert.match(
    frame,
    /onSettingsPreview\(\{ \.\.\.settings, sidebarCollapsed: true \}\)/,
  );
  assert.match(frame, /onCollapseCommit=\{\(\) =>/);
  assert.match(frame, /sidebarCollapsed: true/);
  assert.match(resizeHandle, /rawValue < min - collapseThreshold/);
  assert.match(resizeHandle, /collapsedValue \+ pointerOffset/);
  assert.match(resizeHandle, /rawValue < min/);
  assert.match(resizeHandle, /let dragCollapsed = startedCollapsed/);
  assert.match(
    resizeHandle,
    /dragCollapsed = true;[\s\S]*onCollapse\(\);[\s\S]*return;/,
  );
  assert.match(
    resizeHandle,
    /if \(dragCollapsed\) \{[\s\S]*onCollapseCommit\?\.\(\)/,
  );
  assert.doesNotMatch(
    resizeHandle,
    /if \([^)]*rawValue < min - collapseThreshold[^)]*\) \{\s*cleanup\(/,
  );
  assert.match(resizeHandle, /collapsed \? collapsedValue : value/);
  assert.match(
    appCss,
    /body\[data-resizing='true'\] \.desktop-sidebar\[data-collapsed='false'\][\s\S]*transition-duration: 0ms/,
  );
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
