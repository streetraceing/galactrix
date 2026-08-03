import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appStatePath = new URL('../../src/app/appState.ts', import.meta.url);
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
  const [appState, settings] = await Promise.all([
    readFile(appStatePath, 'utf8'),
    readFile(settingsPath, 'utf8'),
  ]);

  assert.match(
    appState,
    /retry:\s*\{[\s\S]*enabled: true[\s\S]*maxAttempts: 3/,
  );
  assert.match(appState, /dynamicContext:\s*\{[\s\S]*enabled: false/);
  assert.match(appState, /semanticMemory:\s*\{[\s\S]*enabled: false/);
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
  assert.match(moduleCard, /readModuleExpanded\(moduleId, enabled\)/);
  assert.match(moduleCard, /galactrix\.aiModuleCollapsed\./);
  assert.match(moduleCard, /writeStorageItem\(key, 'true'\)/);
  assert.match(moduleCard, /persistModuleCollapsed\(moduleId, false\)/);
  assert.match(moduleCard, /const detailsVisible = enabled && isExpanded/);
  assert.match(moduleCard, /setIsExpanded\(nextEnabled\)/);
  assert.match(moduleCard, /aria-hidden=\{!detailsVisible\}/);
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

test('desktop sidebar keeps centered compact icons and continuous resize collapse', async () => {
  const [sidebar, frame, resizeHandle, appCss] = await Promise.all([
    readFile(sidebarPath, 'utf8'),
    readFile(framePath, 'utf8'),
    readFile(resizeHandlePath, 'utf8'),
    readFile(appCssPath, 'utf8'),
  ]);

  assert.match(sidebar, /compact \? 'w-14' : ''/);
  assert.match(sidebar, /group-data-\[collapsed=true\]\/sidebar:px-2/);
  assert.match(sidebar, /const animateWidth = !resizing \|\| compact/);
  assert.match(
    sidebar,
    /animateWidth[\s\S]*transition-\[width\][\s\S]*transition-none/,
  );
  assert.match(sidebar, /after:w-px after:bg-separator/);
  assert.match(
    frame,
    /\{!isMobile && !hideDesktopNavigation \? \([\s\S]*<ResizeHandle/,
  );
  assert.match(
    frame,
    /const \[sidebarResizing, setSidebarResizing\] = useState\(false\)/,
  );
  assert.match(frame, /resizing=\{sidebarResizing\}/);
  assert.match(frame, /collapsed=\{settings\.sidebarCollapsed\}/);
  assert.match(frame, /collapsedValue=\{DESKTOP_SIDEBAR_COLLAPSED_WIDTH\}/);
  assert.match(frame, /collapseThreshold=\{48\}/);
  assert.match(frame, /resumeThreshold=\{12\}/);
  assert.match(frame, /onResizeStart=\{\(\) => setSidebarResizing\(true\)\}/);
  assert.match(frame, /onResizeEnd=\{\(\) => setSidebarResizing\(false\)\}/);
  assert.match(frame, /className="max-\[920px\]:hidden"/);
  assert.match(frame, /sidebarCollapsed: false/);
  assert.match(frame, /onCollapse=\{\(\) =>/);
  assert.match(
    frame,
    /onSettingsPreview\(\{ \.\.\.settings, sidebarCollapsed: true \}\)/,
  );
  assert.match(frame, /onCollapseCommit=\{\(\) =>/);
  assert.match(frame, /sidebarCollapsed: true/);
  assert.match(resizeHandle, /let dragCollapsed = startedCollapsed/);
  assert.match(resizeHandle, /let expandAtX = startedCollapsed/);
  assert.match(
    resizeHandle,
    /expandAtX = moveEvent\.clientX \+ resumeThreshold/,
  );
  assert.match(resizeHandle, /expandedOriginX = expandAtX/);
  assert.match(resizeHandle, /onResizeStart\?\.\(\)/);
  assert.match(resizeHandle, /onResizeEnd\?\.\(\)/);
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
    /body\[data-resizing='true'\] \.desktop-sidebar\[data-collapsed='false'\][\s\S]*@apply duration-0!/,
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

test('provider embeddings are off by default and nullable backend values stay off', async () => {
  const [helpers, section, editor, models] = await Promise.all([
    readFile(
      new URL(
        '../../src/features/telescope/providerHelpers.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../../src/features/telescope/components/ProviderEmbeddingSection.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../../src/features/telescope/useProviderEditor.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(new URL('../../src-tauri/src/models.rs', import.meta.url), 'utf8'),
  ]);

  assert.match(helpers, /embeddingModel: undefined/);
  assert.match(helpers, /provider\.embeddingModel \?\? undefined/);
  assert.match(section, /form\.embeddingModel != null/);
  assert.match(editor, /form\.embeddingModel == null/);
  assert.match(
    models,
    /skip_serializing_if = "Option::is_none"[\s\S]*embedding_model/,
  );
});

test('a custom embedding URL is treated as the complete endpoint', async () => {
  const [providerClient, endpoints, embeddingSection, ruTelescopeRaw] =
    await Promise.all([
      readFile(
        new URL('../../src-tauri/src/provider_client.rs', import.meta.url),
        'utf8',
      ),
      readFile(
        new URL(
          '../../src-tauri/src/provider_client/endpoints.rs',
          import.meta.url,
        ),
        'utf8',
      ),
      readFile(
        new URL(
          '../../src/features/telescope/components/ProviderEmbeddingSection.tsx',
          import.meta.url,
        ),
        'utf8',
      ),
      readFile(
        new URL('../../src/i18n/locales/ru/telescope.json', import.meta.url),
        'utf8',
      ),
    ]);
  const ruTelescope = JSON.parse(ruTelescopeRaw) as Record<string, string>;

  assert.match(endpoints, /fn embedding_endpoint_saved/);
  assert.match(endpoints, /return Ok\(endpoint\.to_owned\(\)\)/);
  assert.match(providerClient, /client\.post\(&embedding_url\)/);
  assert.match(providerClient, /client\.post\(&url\)/);
  assert.match(providerClient, /uses_ollama_embedding_api/);
  assert.match(endpoints, /normalized\.ends_with\("\/api\/embed"\)/);
  assert.match(providerClient, /parse_embedding_response/);
  assert.match(providerClient, /value\.get\("embeddings"\)/);
  assert.match(providerClient, /value\.get\("embedding"\)/);
  assert.match(embeddingSection, /providerEmbeddingSection\.baseUrlHint/);
  assert.equal(
    ruTelescope['providerEmbeddingSection.baseUrlPlaceholder'],
    'http://127.0.0.1:11534/api/embed',
  );
});

test('providers accept multiple protected API keys with temporary rate-limit rotation', async () => {
  const [
    credentials,
    editor,
    telescope,
    transfer,
    backend,
    models,
    client,
    retry,
    storage,
    ruTelescopeRaw,
  ] = await Promise.all([
    readFile(
      new URL(
        '../../src/features/telescope/components/ProviderCredentials.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../../src/features/telescope/useProviderEditor.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../../src/features/telescope/TelescopeScreen.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL('../../src/features/telescope/transfer.ts', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../../src/lib/backend.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src-tauri/src/models.rs', import.meta.url), 'utf8'),
    readFile(
      new URL('../../src-tauri/src/provider_client.rs', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../../src-tauri/src/provider_client/retry.rs', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../../src-tauri/src/secure_storage.rs', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../../src/i18n/locales/ru/telescope.json', import.meta.url),
      'utf8',
    ),
  ]);
  const ruTelescope = JSON.parse(ruTelescopeRaw) as Record<string, string>;

  assert.match(credentials, /type="password"/);
  assert.match(credentials, /providerCredentials\.addApiKey/);
  assert.match(editor, /setToken\(await onReadSecrets\(provider\.id\)\)/);
  assert.match(editor, /loadingCredentials/);
  assert.match(telescope, /onExportSecrets\(\[providerId\]\)/);
  assert.match(telescope, /\.join\('\\n'\)/);
  assert.match(transfer, /apiKeys: secrets\[provider\.id\]/);
  assert.match(transfer, /normalizeApiKeys\(entry\.apiKeys, entry\.apiKey\)/);
  assert.match(backend, /Record<string, string\[\]>/);
  assert.match(models, /pub api_keys: Option<Vec<String>>/);
  assert.match(models, /normalized_secret/);
  assert.match(retry, /parse_api_keys/);
  assert.match(retry, /x-ratelimit-remaining-requests/);
  assert.match(retry, /x-ratelimit-reset-requests/);
  assert.match(retry, /block_api_key/);
  assert.match(retry, /first_available_key/);
  assert.match(retry, /tokio::time::sleep\(wait\)\.await/);
  assert.match(retry, /buffer_json_response\(response\)\.await/);
  assert.match(retry, /PROVIDER_RESPONSE_READ_FAILED/);
  assert.match(retry, /is_empty_json/);
  assert.doesNotMatch(client, /wait <= Duration::from_millis\(max_delay\)/);
  assert.match(storage, /normalize_provider_secrets/);
  assert.equal(ruTelescope['providerCredentials.apiKeys'], 'API-ключи');
});
