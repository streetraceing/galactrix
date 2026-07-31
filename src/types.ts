export type TabId = 'chats' | 'galaxies' | 'telescope' | 'profile' | 'settings';

export type Chat = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  messageCount: number;
  pinned: boolean;
  providerId?: string;
  personaId?: string;
  characterId?: string;
  universeId?: string;
  worldbookIds: string[];
  promptConfig: PromptConfig;
};

export type PromptPresetId =
  | 'human'
  | 'casual-brief'
  | 'dialogue-only'
  | 'no-emoji'
  | 'first-person'
  | 'concise'
  | 'immersive'
  | 'initiative'
  | 'continuity';

export type PromptPriority = 'low' | 'normal' | 'high' | 'critical';

export type PromptContextPriorities = {
  persona: PromptPriority;
  character: PromptPriority;
  universe: PromptPriority;
  worldbooks: PromptPriority;
  remembered: PromptPriority;
  presets: PromptPriority;
};

export type PromptBlock = {
  id: string;
  title: string;
  content: string;
  priority: PromptPriority;
  enabled: boolean;
};

export type PromptConfig = {
  setIds: string[];
  presetIds: PromptPresetId[];
  contextPriorities: PromptContextPriorities;
  customBlocks: PromptBlock[];
};

export type ChatConfigInput = {
  title: string;
  providerId?: string;
  personaId?: string;
  characterId?: string;
  universeId?: string;
  worldbookIds: string[];
  promptConfig: PromptConfig;
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
  'persona' | 'character' | 'universe' | 'worldbook' | 'style' | 'prompt-set';

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
  avatar?: string;
  gender: 'male' | 'female' | 'unspecified';
  age: string;
  pronouns: string;
  habits: string;
  preferences: string;
  communicationNotes: string;
  attributes: NamedValue[];
};

export type CharacterData = {
  avatar?: string;
  definitionSections: DefinitionSection[];
  stylePreset:
    'neutral' | 'warm' | 'concise' | 'roleplay' | 'literary' | 'custom';
  styleItemId?: string;
  promptSetIds: string[];
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

export type PromptSetData = PromptConfig;

export type GalaxyItemData =
  | PersonaData
  | CharacterData
  | UniverseData
  | WorldbookData
  | StyleData
  | PromptSetData
  | Record<string, unknown>;

export type GalaxyItem = {
  id: string;
  kind: GalaxyKind;
  name: string;
  description: string;
  data: GalaxyItemData;
  badge: string;
  accent: string;
  updatedAt: number;
};

export type GalaxyItemInput = {
  id?: string;
  kind: GalaxyKind;
  name: string;
  description: string;
  data: GalaxyItemData;
};

export type PromptPreviewInput = {
  persona?: GalaxyItemInput;
  character?: GalaxyItemInput;
  universe?: GalaxyItemInput;
  worldbooks: GalaxyItemInput[];
  characterStyle?: GalaxyItemInput;
  promptSets: GalaxyItemInput[];
  promptConfig: PromptConfig;
  rememberedMessages: Message[];
  userName?: string;
  characterName?: string;
  responseLanguage?: 'en' | 'ru';
};

export type PromptPreviewResult = {
  prompt: string;
  approximateTokens: number;
  characters: number;
};

export type ProviderKind =
  | 'mistral'
  | 'character-ai'
  | 'cerebras'
  | 'nvidia-nim'
  | 'google-gemini'
  | 'groq'
  | 'openrouter'
  | 'huggingface'
  | 'ollama'
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
  embeddingModel?: string;
  embeddingBaseUrl?: string;
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
  embeddingModel?: string;
  embeddingBaseUrl?: string;
};

export type ProviderImportInput = {
  provider: ProviderInput;
  apiKey?: string;
};

export type RetrySettings = {
  enabled: boolean;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
};

export type DynamicContextMode = 'local' | 'provider' | 'hybrid';

export type DynamicContextSettings = {
  enabled: boolean;
  mode: DynamicContextMode;
  providerId?: string;
  directMessageLimit: number;
  summaryBatchSize: number;
  triggerMessages: number;
  analysisPrompt: string;
};

export type SemanticMemorySettings = {
  enabled: boolean;
  providerId?: string;
  topK: number;
  similarityThreshold: number;
  batchSize: number;
  includeRememberedMessages: boolean;
  includeDynamicContext: boolean;
  indexArchivedMessages: boolean;
  archivedMessageLimit: number;
};

export type AiModuleSettings = {
  retry: RetrySettings;
  dynamicContext: DynamicContextSettings;
  semanticMemory: SemanticMemorySettings;
};

export type AppSettings = {
  profileName: string;
  profileAvatar?: string;
  animations: boolean;
  haptics: boolean;
  compactMode: boolean;
  sendOnEnter: boolean;
  saveDrafts: boolean;
  chatViewMode: 'conversation' | 'messenger';
  showMessageAvatars: boolean;
  showMessageTimestamps: boolean;
  responseLanguage: 'app' | 'auto';
  interfaceScale: number;
  sidebarWidth: number;
  chatSidebarWidth: number;
  sidebarCollapsed: boolean;
  themeMode: 'light' | 'dark' | 'system';
  themeVariant: 'default' | 'lavender' | 'discord' | 'spotify';
  language: 'system' | 'ru' | 'en';
  aiModules: AiModuleSettings;
};

export type UsagePoint = {
  day: number;
  inputTokens: number;
  outputTokens: number;
  tokens: number;
  requests: number;
};

export type ChatState = {
  chat: Chat;
  messages: Message[];
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

export type EmbeddingProbeResult = {
  dimensions: number;
  latencyMs: number;
};
