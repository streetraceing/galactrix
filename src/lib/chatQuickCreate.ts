const CHAT_QUICK_CREATE_EVENT = 'galactrix:new-chat';

export type ChatQuickCreateRequest = {
  characterId?: string;
};

let pendingRequest: ChatQuickCreateRequest | null = null;

export function requestChatQuickCreate(characterId?: string) {
  pendingRequest = characterId ? { characterId } : {};
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHAT_QUICK_CREATE_EVENT));
  }
}

export function consumeChatQuickCreate(): ChatQuickCreateRequest | null {
  const request = pendingRequest;
  pendingRequest = null;
  return request;
}

export function subscribeChatQuickCreate(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(CHAT_QUICK_CREATE_EVENT, listener);
  return () => window.removeEventListener(CHAT_QUICK_CREATE_EVENT, listener);
}
