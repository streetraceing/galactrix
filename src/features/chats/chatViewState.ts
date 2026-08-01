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

function normalizedState(value: unknown): PersistedChatNavigationState {
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
    const currentRaw = window.localStorage.getItem(CHAT_NAVIGATION_STORAGE_KEY);
    const legacyRaw = window.localStorage.getItem(LEGACY_CHAT_VIEW_STORAGE_KEY);
    cachedState = normalizedState(
      JSON.parse(currentRaw ?? legacyRaw ?? JSON.stringify(emptyState())),
    );

    if (!currentRaw && legacyRaw) {
      window.localStorage.setItem(
        CHAT_NAVIGATION_STORAGE_KEY,
        JSON.stringify(cachedState),
      );
    }
    window.localStorage.removeItem(LEGACY_CHAT_VIEW_STORAGE_KEY);
  } catch {
    cachedState = emptyState();
  }
  return cachedState;
}

function saveState(state: PersistedChatNavigationState) {
  cachedState = state;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CHAT_NAVIGATION_STORAGE_KEY,
      JSON.stringify(state),
    );
    window.localStorage.removeItem(LEGACY_CHAT_VIEW_STORAGE_KEY);
  } catch {
    // Navigation persistence is best-effort (private mode and full storage can fail).
  }
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

export function forgetChatViewState(chatId: string) {
  const current = loadState();
  if (current.activeChatId !== chatId) return;
  saveState({ version: 1, activeChatId: '', isChatOpen: false });
}

export function resetChatViewStateForTests() {
  cachedState = null;
}
