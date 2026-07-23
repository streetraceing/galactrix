export type TabId = 'chats' | 'galaxies' | 'telescope' | 'profile';

export type Chat = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  messageCount: number;
  pinned: boolean;
  providerId?: string;
};

export type Message = {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
};

export type GalaxyKind = 'persona' | 'character' | 'universe' | 'worldbook';

export type GalaxyItem = {
  id: string;
  kind: GalaxyKind;
  name: string;
  description: string;
  badge: string;
  accent: string;
  updatedAt: string;
};

export type GalaxyItemInput = {
  id?: string;
  kind: GalaxyKind;
  name: string;
  description: string;
};

export type ProviderKind =
  | 'mistral'
  | 'character-ai'
  | 'cerebras'
  | 'nvidia-nim'
  | 'ollama-cloud'
  | 'cloudflare-workers-ai'
  | 'custom';

export type ProviderStatus = 'connected' | 'disabled' | 'error';

export type Provider = {
  id: string;
  name: string;
  kind: ProviderKind;
  model: string;
  status: ProviderStatus;
  baseUrl?: string;
  accountId?: string;
  latencyMs?: number;
  temperature: number;
  topP: number;
  maxTokens: number;
  hasSecret: boolean;
};

export type ProviderInput = {
  id?: string;
  name: string;
  kind: ProviderKind;
  model: string;
  baseUrl?: string;
  accountId?: string;
  temperature: number;
  topP: number;
  maxTokens: number;
};

export type AppSettings = {
  animations: boolean;
  haptics: boolean;
  compactMode: boolean;
  sendOnEnter: boolean;
  saveDrafts: boolean;
  interfaceScale: number;
  sidebarWidth: number;
  chatSidebarWidth: number;
};

export type UsagePoint = {
  label: string;
  tokens: number;
  requests: number;
};

export type AppSnapshot = {
  chats: Chat[];
  messages: Message[];
  galaxyItems: GalaxyItem[];
  providers: Provider[];
  settings: AppSettings;
  usage: UsagePoint[];
  appVersion: string;
};

export type ProviderModelResult = {
  models: string[];
  latencyMs: number;
};
