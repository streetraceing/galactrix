const CHAT_NAVIGATION_STORAGE_KEY = 'galactrix-chat-navigation-v1';
const LEGACY_CHAT_VIEW_STORAGE_KEY = 'galactrix-chat-view-state-v1';

type PersistedChatNavigationState = {
  version: 1;
  activeChatId: string;
  isChatOpen: boolean;
};

const emptyState = (): PersistedChatNavigationState => ({
  version: 1,
  activeChatId: '',
  isChatOpen: false,
});

let cachedState: PersistedChatNavigationState | null = null;

function normalizeState(value: unknown): PersistedChatNavigationState {
  if (!value || typeof value !== 'object') return emptyState();
  const input = value as Partial<PersistedChatNavigationState>;
  return {
    version: 1,
    activeChatId:
      typeof input.activeChatId === 'string' ? input.activeChatId : '',
    isChatOpen: input.isChatOpen === true,
  };
}

function loadState() {
  if (cachedState) return cachedState;
  if (typeof window === 'undefined') {
    cachedState = emptyState();
    return cachedState;
  }

  try {
    const currentRaw = readStorageItem(CHAT_NAVIGATION_STORAGE_KEY);
    const legacyRaw = readStorageItem(LEGACY_CHAT_VIEW_STORAGE_KEY);
    cachedState = normalizeState(
      JSON.parse(currentRaw ?? legacyRaw ?? JSON.stringify(emptyState())),
    );

    if (!currentRaw && legacyRaw) {
      writeStorageItem(
        CHAT_NAVIGATION_STORAGE_KEY,
        JSON.stringify(cachedState),
      );
    }
    removeStorageItem(LEGACY_CHAT_VIEW_STORAGE_KEY);
  } catch {
    cachedState = emptyState();
  }
  return cachedState;
}

function saveState(state: PersistedChatNavigationState) {
  cachedState = state;
  writeStorageItem(CHAT_NAVIGATION_STORAGE_KEY, JSON.stringify(state));
  removeStorageItem(LEGACY_CHAT_VIEW_STORAGE_KEY);
}

export function readChatNavigationState() {
  return loadState();
}

export function saveChatNavigationState(
  activeChatId: string,
  isChatOpen: boolean,
) {
  const current = loadState();
  if (
    current.activeChatId === activeChatId &&
    current.isChatOpen === isChatOpen
  ) {
    return;
  }
  saveState({ version: 1, activeChatId, isChatOpen });
}

export function forgetChatNavigationState(chatId: string) {
  const current = loadState();
  if (current.activeChatId !== chatId) return;
  saveState({ version: 1, activeChatId: '', isChatOpen: false });
}

export function resetChatNavigationStateForTests() {
  cachedState = null;
}
import {
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from '../lib/storage';
