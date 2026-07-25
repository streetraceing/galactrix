export type TabId = 'chats' | 'galaxies' | 'telescope' | 'profile';

export type Chat = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  messageCount: number;
  pinned: boolean;
  providerId?: string;
  personaId?: string;
  characterId?: string;
  universeId?: string;
  worldbookIds: string[];
  responsePreset: ResponsePreset;
};

export type ResponsePreset =
  | 'natural'
  | 'human'
  | 'dialogue-only'
  | 'no-emoji'
  | 'first-person'
  | 'clean-human';

export type ChatConfigInput = {
  title: string;
  providerId?: string;
  personaId?: string;
  characterId?: string;
  universeId?: string;
  worldbookIds: string[];
  responsePreset: ResponsePreset;
};

export type MessageVariant = {
  id: string;
  index: number;
  content: string;
  createdAt: string;
};

export type Message = {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  remembered: boolean;
  activeVariantIndex: number;
  variants: MessageVariant[];
};

export type GalaxyKind =
  'persona' | 'character' | 'universe' | 'worldbook' | 'style';

export type NamedValue = {
  id: string;
  title: string;
  value: string;
};

export type DefinitionSection = {
  id: string;
  title: string;
  content: string;
};

export type WorldbookEntry = {
  id: string;
  title: string;
  keywords: string;
  content: string;
  enabled: boolean;
};

export type PersonaData = {
  gender: string;
  age: string;
  pronouns: string;
  habits: string;
  preferences: string;
  communicationNotes: string;
  attributes: NamedValue[];
};

export type CharacterData = {
  definitionSections: DefinitionSection[];
  stylePreset:
    'neutral' | 'warm' | 'concise' | 'roleplay' | 'literary' | 'custom';
  styleItemId?: string;
};

export type UniverseData = {
  rules: DefinitionSection[];
};

export type WorldbookData = {
  entries: WorldbookEntry[];
};

export type StyleData = {
  instructions: string;
  example: string;
};

export type GalaxyItemData =
  | PersonaData
  | CharacterData
  | UniverseData
  | WorldbookData
  | StyleData
  | Record<string, unknown>;

export type GalaxyItem = {
  id: string;
  kind: GalaxyKind;
  name: string;
  description: string;
  data: GalaxyItemData;
  badge: string;
  accent: string;
  updatedAt: string;
};

export type GalaxyItemInput = {
  id?: string;
  kind: GalaxyKind;
  name: string;
  description: string;
  data: GalaxyItemData;
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
  sidebarCollapsed: boolean;
  themeMode: 'light' | 'dark' | 'system';
  themeVariant: 'default' | 'lavender' | 'discord' | 'spotify';
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
