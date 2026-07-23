import type { Chat, Message, Provider } from '../../types';

export type ChatAction = 'rename' | 'pin' | 'clear' | 'delete';

export type ChatsScreenProps = {
  chats: Chat[];
  messages: Message[];
  providers: Provider[];
  activeChatId: string;
  chatSidebarWidth: number;
  onChatSidebarWidthPreview: (width: number) => void;
  onChatSidebarWidthCommit: (width: number) => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => Promise<void>;
  onRenameChat: (chatId: string, title: string) => Promise<void>;
  onDeleteChat: (chatId: string) => Promise<void>;
  onSetPinned: (chatId: string, pinned: boolean) => Promise<void>;
  onClearChat: (chatId: string) => Promise<void>;
  onSend: (content: string, providerId: string) => Promise<void>;
  onSetProvider: (chatId: string, providerId?: string) => Promise<void>;
  sendOnEnter: boolean;
  saveDrafts: boolean;
  sending: boolean;
};
