import type {
  CharacterData,
  ChatConfigInput,
  GalaxyItem,
  GalaxyItemInput,
  Message,
  PromptPreviewInput,
} from '../../types';
import { getLocale, i18next } from '../../i18n';
import { clonePromptConfig, defaultPromptConfig } from './promptConfig';

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
  rememberedMessages: Message[] = [],
  responseLanguage?: 'en' | 'ru',
): PromptPreviewInput {
  const persona = findInput(items, config.personaId, 'persona');
  const character = findInput(items, config.characterId, 'character');
  const universe = findInput(items, config.universeId, 'universe');
  const characterData = character?.data as CharacterData | undefined;

  return {
    persona,
    character,
    universe,
    worldbooks: config.worldbookIds
      .map((id) => findInput(items, id, 'worldbook'))
      .filter((item): item is GalaxyItemInput => Boolean(item)),
    characterStyle: findInput(items, characterData?.styleItemId, 'style'),
    promptSets: selectedPromptSets(
      items,
      config.promptConfig.setIds,
      character,
    ),
    promptConfig: config.promptConfig,
    rememberedMessages,
    userName: persona?.name || profileName,
    characterName: character?.name,
    responseLanguage,
  };
}

export function promptPreviewFromDraft(
  draft: GalaxyItemInput,
  items: GalaxyItem[],
): PromptPreviewInput {
  const input: PromptPreviewInput = {
    worldbooks: [],
    promptSets: [],
    promptConfig: clonePromptConfig(defaultPromptConfig),
    rememberedMessages: [],
    userName: i18next.t('user.defaultName', { ns: 'common' }),
    responseLanguage: getLocale(),
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
      input.characterStyle = findInput(items, data.styleItemId, 'style');
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
      input.character = {
        kind: 'character',
        name: i18next.t('preview.character', { ns: 'chats' }),
        description: '',
        data: {
          definitionSections: [],
          stylePreset: 'custom',
          promptSetIds: [],
        } satisfies CharacterData,
      };
      input.characterStyle = draft;
      break;
    case 'prompt-set':
      input.promptSets = [draft];
      break;
  }

  return input;
}
