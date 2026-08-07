import type {
  AiModuleSettings,
  AppSettings,
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
  aiModules: AiModuleSettings;
  profileName: string;
  profileAvatar?: string;
  activeChatId: string;
  isChatOpen: boolean;
  chatMaximized: boolean;
  chatSidebarWidth: number;
  onChatSidebarWidthPreview: (width: number) => void;
  onChatSidebarWidthCommit: (width: number) => void;
  onSelectChat: (id: string) => void;
  onCloseChat: () => void;
  onChatMaximizedChange: (maximized: boolean) => void;
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
  onDeleteMessages: (messageIds: string[]) => Promise<void>;
  onRememberMessage: (messageId: string, remembered: boolean) => Promise<void>;
  onRegenerateMessage: (messageId: string) => Promise<void>;
  onContinueMessage: (messageId: string) => Promise<void>;
  onSelectMessageVariant: (
    messageId: string,
    variantIndex: number,
  ) => Promise<void>;
  onSend: (content: string) => Promise<void>;
  onCancelGeneration: () => Promise<void>;
  sendOnEnter: boolean;
  focusComposerAfterSend: boolean;
  saveDrafts: boolean;
  chatViewMode: AppSettings['chatViewMode'];
  showMessageAvatars: boolean;
  showMessageTimestamps: boolean;
  responseLanguage?: 'en' | 'ru';
  sending: boolean;
};
