import type {
  CharacterData,
  Chat,
  ChatConfigInput,
  GalaxyItem,
  Message,
  PromptContextPriorities,
} from '../../types';
import { clonePromptConfig, defaultPromptConfig } from './promptConfig';

export function createChatConfig(defaultTitle: string): ChatConfigInput {
  return {
    title: defaultTitle,
    greetingMessage: '',
    worldbookIds: [],
    promptConfig: clonePromptConfig(defaultPromptConfig),
    moduleOverrides: {},
  };
}

export function chatConfigFromChat(chat: Chat): ChatConfigInput {
  return {
    title: chat.title,
    providerId: chat.providerId,
    personaId: chat.personaId,
    characterId: chat.characterId,
    styleItemId: chat.styleItemId,
    universeId: chat.universeId,
    worldbookIds: [...chat.worldbookIds],
    promptConfig: clonePromptConfig(chat.promptConfig),
    moduleOverrides: { ...(chat.moduleOverrides ?? {}) },
  };
}

export function isChatConfigValid(
  config: ChatConfigInput,
  { allowEmptyTitle = false }: { allowEmptyTitle?: boolean } = {},
) {
  return (
    (allowEmptyTitle || Boolean(config.title.trim())) &&
    config.promptConfig.customBlocks.every(
      (block) =>
        !block.enabled || Boolean(block.title.trim() && block.content.trim()),
    )
  );
}

export function automaticChatTitle(
  characterId: string | undefined,
  chats: readonly Chat[],
  galaxyItems: readonly GalaxyItem[],
) {
  const character = characterId
    ? galaxyItems.find(
        (item) => item.kind === 'character' && item.id === characterId,
      )
    : undefined;
  const existingCount = chats.filter((chat) =>
    characterId ? chat.characterId === characterId : !chat.characterId,
  ).length;
  const rawBase = character?.name.trim() || 'Chat';
  let sequence = existingCount + 1;

  while (true) {
    const suffix = ` #${sequence}`;
    const maxBaseCharacters = Math.max(0, 120 - [...suffix].length);
    const base = [...rawBase].slice(0, maxBaseCharacters).join('') || 'Chat';
    const title = `${base}${suffix}`;
    const collides = chats.some(
      (chat) =>
        chat.title === title &&
        (characterId ? chat.characterId === characterId : !chat.characterId),
    );
    if (!collides) return title;
    sequence += 1;
  }
}

export function activePromptSources(
  config: ChatConfigInput,
  messages: Message[],
): Array<keyof PromptContextPriorities> {
  return [
    ...(config.personaId ? (['persona'] as const) : []),
    ...(config.characterId || config.styleItemId
      ? (['character'] as const)
      : []),
    ...(config.universeId ? (['universe'] as const) : []),
    ...(config.worldbookIds.length ? (['worldbooks'] as const) : []),
    ...(messages.some((message) => message.remembered)
      ? (['remembered'] as const)
      : []),
    ...(config.promptConfig.presetIds.length ? (['presets'] as const) : []),
  ];
}

export function inheritedPromptSetIds(
  config: Pick<ChatConfigInput, 'characterId'>,
  galaxyItems: GalaxyItem[],
) {
  const character = galaxyItems.find(
    (item) => item.kind === 'character' && item.id === config.characterId,
  );
  return character
    ? [...((character.data as CharacterData).promptSetIds ?? [])]
    : [];
}

export function effectiveStyleItemId(
  config: Pick<ChatConfigInput, 'characterId' | 'styleItemId'>,
  galaxyItems: GalaxyItem[],
) {
  if (config.styleItemId) return config.styleItemId;
  const character = galaxyItems.find(
    (item) => item.kind === 'character' && item.id === config.characterId,
  );
  if (!character) return undefined;
  const data = character.data as CharacterData;
  return data.stylePreset === 'custom' ? data.styleItemId : undefined;
}

export function normalizeRecentMessageLimit(rawValue: string) {
  if (rawValue.trim() === '') return 0;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed)
    ? Math.min(500, Math.max(0, Math.floor(parsed)))
    : 0;
}
