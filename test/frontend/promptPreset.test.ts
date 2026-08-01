import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const promptConfigPath = new URL(
  '../../src/features/chats/promptConfig.ts',
  import.meta.url,
);
const promptModelPath = new URL(
  '../../src/features/chats/components/prompt-builder/promptBuilderModel.ts',
  import.meta.url,
);

test('brief conversational style is built in and included in natural dialogue', async () => {
  const [config, model] = await Promise.all([
    readFile(promptConfigPath, 'utf8'),
    readFile(promptModelPath, 'utf8'),
  ]);

  assert.match(config, /id: 'casual-brief'/);
  assert.match(config, /promptRule\.casualBrief\.label/);
  assert.match(model, /livingDialogueBundle[\s\S]*'casual-brief'/);
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

test('roleplay and Telegram bundles are available as built-in prompt sets', async () => {
  const [
    config,
    model,
    section,
    builder,
    responseRules,
    ruChatsRaw,
    ruGalaxiesRaw,
  ] = await Promise.all([
    readFile(promptConfigPath, 'utf8'),
    readFile(promptModelPath, 'utf8'),
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
  assert.match(model, /roleplayBundle[\s\S]*'no-user-control'/);
  assert.match(model, /telegramChatBundle[\s\S]*'telegram-chat'/);
  assert.match(section, /promptRulesSection\.roleplaySet/);
  assert.match(section, /promptRulesSection\.telegramSet/);
  assert.match(
    responseRules,
    /Never decide, narrate, or imply the user's actions/,
  );
  assert.match(builder, /"roleplay-rich"/);
  assert.match(builder, /"telegram-human"/);
  assert.equal(
    ruChats['promptRulesSection.roleplaySet'],
    'Набор «Хороший роллплей»',
  );
  assert.equal(
    ruChats['promptRulesSection.telegramSet'],
    'Набор «Переписка в Telegram»',
  );
  assert.equal(ruGalaxies['style.roleplayRich'], 'Глубокий роллплей');
  assert.equal(ruGalaxies['style.telegramHuman'], 'Как человек в Telegram');
});
