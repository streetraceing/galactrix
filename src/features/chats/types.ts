import type {
  Chat,
  ChatConfigInput,
  GalaxyItem,
  Message,
  Provider,
} from '../../types';

export type ChatAction =
  | 'configure'
  | 'duplicate'
  | 'duplicate-with-messages'
  | 'rename'
  | 'pin'
  | 'clear'
  | 'delete';

export type ChatsScreenProps = {
  chats: Chat[];
  messages: Message[];
  providers: Provider[];
  galaxyItems: GalaxyItem[];
  activeChatId: string;
  chatSidebarWidth: number;
  onChatSidebarWidthPreview: (width: number) => void;
  onChatSidebarWidthCommit: (width: number) => void;
  onSelectChat: (id: string) => void;
  onNewChat: (input: ChatConfigInput) => Promise<void>;
  onUpdateChat: (chatId: string, input: ChatConfigInput) => Promise<void>;
  onRenameChat: (chatId: string, title: string) => Promise<void>;
  onDeleteChat: (chatId: string) => Promise<void>;
  onSetPinned: (chatId: string, pinned: boolean) => Promise<void>;
  onClearChat: (chatId: string) => Promise<void>;
  onCloneChat: (
    chatId: string,
    includeMessages: boolean,
    input?: ChatConfigInput,
  ) => Promise<void>;
  onBranchMessage: (messageId: string) => Promise<void>;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onRememberMessage: (messageId: string, remembered: boolean) => Promise<void>;
  onRegenerateMessage: (messageId: string) => Promise<void>;
  onSelectMessageVariant: (
    messageId: string,
    variantIndex: number,
  ) => Promise<void>;
  onSend: (content: string) => Promise<void>;
  sendOnEnter: boolean;
  saveDrafts: boolean;
  sending: boolean;
};
