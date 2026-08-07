import type {
  AiModuleSettings,
  CharacterData,
  ChatConfigInput,
  GalaxyItem,
  GalaxyItemInput,
  Message,
  PromptPreviewInput,
} from '../../types';
import { i18next } from '../../i18n';
import { clonePromptConfig, defaultPromptConfig } from './promptConfig';
import { effectiveStyleItemId } from './chatConfig';
import { effectiveChatModuleEnabled } from './chatModules';

function asInput(item: GalaxyItem): GalaxyItemInput {
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    description: item.description,
    data: item.data,
  };
}

function findInput(
  items: GalaxyItem[],
  id: string | undefined,
  kind: GalaxyItem['kind'],
) {
  const item = items.find((entry) => entry.id === id && entry.kind === kind);
  return item ? asInput(item) : undefined;
}

function selectedPromptSets(
  items: GalaxyItem[],
  directIds: string[],
  character?: GalaxyItemInput,
) {
  const characterIds =
    character?.kind === 'character'
      ? ((character.data as CharacterData).promptSetIds ?? [])
      : [];
  const ids = new Set([...directIds, ...characterIds]);
  return items
    .filter((item) => item.kind === 'prompt-set' && ids.has(item.id))
    .map(asInput);
}

export function promptPreviewFromChat(
  config: ChatConfigInput,
  items: GalaxyItem[],
  profileName?: string,
  conversationMessages: Message[] = [],
  responseLanguage?: 'en' | 'ru',
  aiModules?: AiModuleSettings,
): PromptPreviewInput {
  const persona = findInput(items, config.personaId, 'persona');
  const character = findInput(items, config.characterId, 'character');
  const universe = findInput(items, config.universeId, 'universe');

  const contextBudget = aiModules
    ? {
        ...aiModules.contextBudget,
        enabled: effectiveChatModuleEnabled(
          aiModules,
          config.moduleOverrides,
          'contextBudget',
        ),
      }
    : undefined;
  const repetitionGuard = aiModules
    ? {
        ...aiModules.repetitionGuard,
        enabled: effectiveChatModuleEnabled(
          aiModules,
          config.moduleOverrides,
          'repetitionGuard',
        ),
      }
    : undefined;

  return {
    scope: 'request',
    persona,
    character,
    universe,
    worldbooks: config.worldbookIds
      .map((id) => findInput(items, id, 'worldbook'))
      .filter((item): item is GalaxyItemInput => Boolean(item)),
    characterStyle: findInput(
      items,
      effectiveStyleItemId(config, items),
      'style',
    ),
    promptSets: selectedPromptSets(
      items,
      config.promptConfig.setIds,
      character,
    ),
    promptConfig: config.promptConfig,
    rememberedMessages: conversationMessages.filter(
      (message) => message.remembered,
    ),
    conversationMessages,
    userName:
      persona?.name ||
      profileName ||
      i18next.t('user.defaultName', { ns: 'common' }),
    characterName:
      character?.name || i18next.t('preview.character', { ns: 'chats' }),
    responseLanguage,
    contextBudget,
    repetitionGuard,
    dynamicContextEnabled: aiModules
      ? effectiveChatModuleEnabled(
          aiModules,
          config.moduleOverrides,
          'dynamicContext',
        )
      : false,
    semanticMemoryEnabled: aiModules
      ? effectiveChatModuleEnabled(
          aiModules,
          config.moduleOverrides,
          'semanticMemory',
        )
      : false,
  };
}

export function promptPreviewFromDraft(
  draft: GalaxyItemInput,
  items: GalaxyItem[],
): PromptPreviewInput {
  const input: PromptPreviewInput = {
    scope: 'contribution',
    worldbooks: [],
    promptSets: [],
    promptConfig: clonePromptConfig(defaultPromptConfig),
    rememberedMessages: [],
    conversationMessages: [],
    userName: i18next.t('user.defaultName', { ns: 'common' }),
  };

  switch (draft.kind) {
    case 'persona':
      input.persona = draft;
      input.userName = draft.name;
      break;
    case 'character': {
      const data = draft.data as CharacterData;
      input.character = draft;
      input.characterName = draft.name;
      input.characterStyle =
        data.stylePreset === 'custom'
          ? findInput(items, data.styleItemId, 'style')
          : undefined;
      input.promptSets = selectedPromptSets(items, [], draft);
      break;
    }
    case 'universe':
      input.universe = draft;
      break;
    case 'worldbook':
      input.worldbooks = [draft];
      break;
    case 'style':
      input.characterStyle = draft;
      break;
    case 'prompt-set':
      input.promptSets = [draft];
      break;
  }

  return input;
}
