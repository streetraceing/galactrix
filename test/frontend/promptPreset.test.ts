import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const promptConfigPath = new URL(
  '../../src/features/chats/promptConfig.ts',
  import.meta.url,
);
test('brief conversational style is built in and included in natural dialogue', async () => {
  const config = await readFile(promptConfigPath, 'utf8');

  assert.match(config, /id: 'casual-brief'/);
  assert.match(config, /promptRule\.casualBrief\.label/);
  assert.match(config, /id: 'natural-dialogue'[\s\S]*'casual-brief'/);
});

const promptPreviewPath = new URL(
  '../../src/features/chats/promptPreview.ts',
  import.meta.url,
);
const promptBuilderPath = new URL(
  '../../src-tauri/src/prompt_builder.rs',
  import.meta.url,
);
const ruChatsPath = new URL(
  '../../src/i18n/locales/ru/chats.json',
  import.meta.url,
);

test('a chat without a character is represented as an assistant', async () => {
  const [preview, builder, ruChatsRaw] = await Promise.all([
    readFile(promptPreviewPath, 'utf8'),
    readFile(promptBuilderPath, 'utf8'),
    readFile(ruChatsPath, 'utf8'),
  ]);
  const ruChats = JSON.parse(ruChatsRaw) as Record<string, string>;

  assert.match(preview, /i18next\.t\('preview\.character'/);
  assert.equal(ruChats['preview.character'], 'Ассистент');
  assert.match(builder, /unwrap_or\("Assistant"\)/);
  assert.match(builder, /prompt\.replace\("\{\{char\}\}", assistant_name\)/);
});

test('relaxed lowercase is a built-in character response style', async () => {
  const [model, builder, ruGalaxiesRaw] = await Promise.all([
    readFile(
      new URL('../../src/features/galaxies/model.ts', import.meta.url),
      'utf8',
    ),
    readFile(promptBuilderPath, 'utf8'),
    readFile(
      new URL('../../src/i18n/locales/ru/galaxies.json', import.meta.url),
      'utf8',
    ),
  ]);
  const ruGalaxies = JSON.parse(ruGalaxiesRaw) as Record<string, string>;

  assert.match(model, /id: 'casual-lowercase'/);
  assert.match(builder, /"casual-lowercase"/);
  assert.match(builder, /personal names/);
  assert.match(builder, /proper nouns/);
  assert.equal(ruGalaxies['style.casualLowercase'], 'Разговорный строчными');
});

test('lowercase chat rules are available in the prompt constructor', async () => {
  const [config, ruChatsRaw, responseRules] = await Promise.all([
    readFile(promptConfigPath, 'utf8'),
    readFile(ruChatsPath, 'utf8'),
    readFile(
      new URL('../../src-tauri/src/response_rules.rs', import.meta.url),
      'utf8',
    ),
  ]);
  const ruChats = JSON.parse(ruChatsRaw) as Record<string, string>;

  assert.match(config, /id: 'casual-lowercase'/);
  assert.match(config, /id: 'strict-lowercase'/);
  assert.equal(
    ruChats['promptRule.casualLowercase.label'],
    'Разговорный строчными',
  );
  assert.equal(ruChats['promptRule.strictLowercase.label'], 'Строго строчными');
  assert.match(responseRules, /прост проверял связь, что делаешь\?/);
  assert.match(responseRules, /Never ignore this rule/);
});

test('built-in prompt sets cover chat and roleplay workflows through one select', async () => {
  const [config, section, builder, responseRules, ruChatsRaw, ruGalaxiesRaw] =
    await Promise.all([
      readFile(promptConfigPath, 'utf8'),
      readFile(
        new URL(
          '../../src/features/chats/components/prompt-builder/PromptRulesSection.tsx',
          import.meta.url,
        ),
        'utf8',
      ),
      readFile(promptBuilderPath, 'utf8'),
      readFile(
        new URL('../../src-tauri/src/response_rules.rs', import.meta.url),
        'utf8',
      ),
      readFile(ruChatsPath, 'utf8'),
      readFile(
        new URL('../../src/i18n/locales/ru/galaxies.json', import.meta.url),
        'utf8',
      ),
    ]);
  const ruChats = JSON.parse(ruChatsRaw) as Record<string, string>;
  const ruGalaxies = JSON.parse(ruGalaxiesRaw) as Record<string, string>;

  for (const id of [
    'roleplay-actions',
    'no-user-control',
    'character-consistency',
    'scene-pacing',
    'telegram-chat',
  ]) {
    assert.match(config, new RegExp(`id: '${id}'`));
  }
  for (const bundleId of [
    'natural-dialogue',
    'focused-assistant',
    'relaxed-chat',
    'minimal-chat',
    'telegram-chat',
    'roleplay-balanced',
    'roleplay-immersive',
    'roleplay-proactive',
    'roleplay-dialogue',
  ]) {
    assert.match(config, new RegExp(`id: '${bundleId}'`));
  }
  assert.match(config, /matchingPromptBundleId/);
  assert.match(section, /<Select[\s\S]*promptRulesSection\.builtInSets/);
  assert.match(section, /promptBundles\.map/);
  assert.match(section, /presetIds: \[\.\.\.bundle\.presetIds\]/);
  assert.match(
    responseRules,
    /Never decide, narrate, or imply the user's actions/,
  );
  assert.match(builder, /"roleplay-rich"/);
  assert.match(builder, /"telegram-human"/);
  assert.equal(
    ruChats['promptBundle.roleplayImmersive.label'],
    'Погружающий роллплей',
  );
  assert.equal(
    ruChats['promptBundle.focusedAssistant.label'],
    'Сфокусированный ассистент',
  );
  assert.equal(ruGalaxies['style.roleplayRich'], 'Глубокий роллплей');
  assert.equal(ruGalaxies['style.telegramHuman'], 'Как человек в Telegram');
});

test('chat setup exposes a bounded recent-message context limit', async () => {
  const [setup, config, preview, backend, previewBackend] = await Promise.all([
    readFile(
      new URL(
        '../../src/features/chats/components/ChatSetupModal.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(promptConfigPath, 'utf8'),
    readFile(promptPreviewPath, 'utf8'),
    readFile(
      new URL('../../src-tauri/src/generation_context.rs', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../../src-tauri/src/prompt_preview.rs', import.meta.url),
      'utf8',
    ),
  ]);

  assert.match(config, /recentMessageLimit: 50/);
  assert.match(setup, /chat-recent-message-limit/);
  assert.match(setup, /max=\{500\}/);
  assert.match(preview, /conversationMessages,/);
  assert.match(
    backend,
    /history\[history\.len\(\) - recent_message_limit\.\.\]/,
  );
  assert.match(previewBackend, /apply_recent_message_limit/);
});

test('prompt builder keeps convenience wrappers test-only while production uses histories API', async () => {
  const [builder, generationContext, previewBackend] = await Promise.all([
    readFile(promptBuilderPath, 'utf8'),
    readFile(
      new URL('../../src-tauri/src/generation_context.rs', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../../src-tauri/src/prompt_preview.rs', import.meta.url),
      'utf8',
    ),
  ]);

  assert.match(builder, /#\[cfg\(test\)\]\nfn build_system_prompt\(/);
  assert.match(
    builder,
    /#\[cfg\(test\)\]\nfn build_system_prompt_with_options\(/,
  );
  assert.match(generationContext, /build_system_prompt_with_histories\(/);
  assert.match(previewBackend, /build_system_prompt_with_histories\(/);
});
