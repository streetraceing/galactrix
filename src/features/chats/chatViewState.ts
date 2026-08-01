const CHAT_VIEW_STORAGE_KEY = 'galactrix-chat-view-state-v1';
const MAX_STORED_CHAT_POSITIONS = 80;

export type ChatScrollPosition = {
  scrollTop: number;
  anchorMessageId?: string;
  anchorOffset: number;
  atBottom: boolean;
  updatedAt: number;
};

type PersistedChatViewState = {
  version: 1;
  activeChatId: string;
  isChatOpen: boolean;
  scrollByChat: Record<string, ChatScrollPosition>;
};

const emptyState = (): PersistedChatViewState => ({
  version: 1,
  activeChatId: '',
  isChatOpen: false,
  scrollByChat: {},
});

let cachedState: PersistedChatViewState | null = null;
const sessionScrollByChat = new Map<string, ChatScrollPosition>();

function finiteNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizedScrollPosition(value: unknown): ChatScrollPosition | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<ChatScrollPosition>;
  const anchorMessageId =
    typeof input.anchorMessageId === 'string' && input.anchorMessageId
      ? input.anchorMessageId
      : undefined;
  return {
    scrollTop: Math.max(0, finiteNumber(input.scrollTop)),
    anchorMessageId,
    anchorOffset: finiteNumber(input.anchorOffset),
    atBottom: input.atBottom === true,
    updatedAt: Math.max(0, finiteNumber(input.updatedAt)),
  };
}

function loadState() {
  if (cachedState) return cachedState;
  if (typeof window === 'undefined') {
    cachedState = emptyState();
    return cachedState;
  }

  try {
    const raw = window.localStorage.getItem(CHAT_VIEW_STORAGE_KEY);
    if (!raw) {
      cachedState = emptyState();
      return cachedState;
    }
    const parsed = JSON.parse(raw) as Partial<PersistedChatViewState>;
    const scrollByChat: Record<string, ChatScrollPosition> = {};
    if (parsed.scrollByChat && typeof parsed.scrollByChat === 'object') {
      for (const [chatId, value] of Object.entries(parsed.scrollByChat)) {
        const position = normalizedScrollPosition(value);
        if (chatId && position) scrollByChat[chatId] = position;
      }
    }
    cachedState = {
      version: 1,
      activeChatId:
        typeof parsed.activeChatId === 'string' ? parsed.activeChatId : '',
      isChatOpen: parsed.isChatOpen === true,
      scrollByChat,
    };
  } catch {
    cachedState = emptyState();
  }
  return cachedState;
}

function saveState(state: PersistedChatViewState) {
  cachedState = state;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHAT_VIEW_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // UI state persistence is best-effort (private mode and full storage can fail).
  }
}

export function readChatNavigationState() {
  const state = loadState();
  return {
    activeChatId: state.activeChatId,
    isChatOpen: state.isChatOpen,
  };
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
  saveState({ ...current, activeChatId, isChatOpen });
}

export function readChatScrollPosition(chatId: string) {
  return loadState().scrollByChat[chatId];
}

export function readSessionChatScrollPosition(chatId: string) {
  return sessionScrollByChat.get(chatId);
}

export function saveChatScrollPosition(
  chatId: string,
  position: Omit<ChatScrollPosition, 'updatedAt'>,
) {
  if (!chatId) return;
  const current = loadState();
  const nextPosition: ChatScrollPosition = {
    ...position,
    scrollTop: Math.max(0, finiteNumber(position.scrollTop)),
    anchorOffset: finiteNumber(position.anchorOffset),
    updatedAt: Date.now(),
  };
  sessionScrollByChat.set(chatId, nextPosition);
  const scrollByChat = {
    ...current.scrollByChat,
    [chatId]: nextPosition,
  };
  const entries = Object.entries(scrollByChat);
  if (entries.length > MAX_STORED_CHAT_POSITIONS) {
    entries
      .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
      .slice(MAX_STORED_CHAT_POSITIONS)
      .forEach(([staleChatId]) => delete scrollByChat[staleChatId]);
  }
  saveState({ ...current, scrollByChat });
}

export function forgetChatViewState(chatId: string) {
  const current = loadState();
  if (!current.scrollByChat[chatId] && current.activeChatId !== chatId) return;
  const scrollByChat = { ...current.scrollByChat };
  delete scrollByChat[chatId];
  sessionScrollByChat.delete(chatId);
  saveState({
    ...current,
    activeChatId: current.activeChatId === chatId ? '' : current.activeChatId,
    isChatOpen: current.activeChatId === chatId ? false : current.isChatOpen,
    scrollByChat,
  });
}

export function resolveStoredScrollTop(
  messageIds: readonly string[],
  offsets: readonly number[],
  position: ChatScrollPosition | undefined,
  viewportHeight: number,
) {
  const totalHeight = offsets[offsets.length - 1] ?? 0;
  const maximum = Math.max(0, totalHeight - Math.max(0, viewportHeight));
  if (!position || position.atBottom) return maximum;

  if (position.anchorMessageId) {
    const anchorIndex = messageIds.indexOf(position.anchorMessageId);
    if (anchorIndex >= 0 && offsets[anchorIndex] != null) {
      return Math.max(
        0,
        Math.min(maximum, offsets[anchorIndex] - position.anchorOffset),
      );
    }
  }

  return Math.max(0, Math.min(maximum, position.scrollTop));
}

export function resetChatViewStateForTests() {
  cachedState = null;
  sessionScrollByChat.clear();
}
