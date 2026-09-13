export type TabId = 'chats' | 'galaxies' | 'telescope' | 'profile' | 'settings';

export type Chat = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  messageCount: number;
  pinned: boolean;
  archived: boolean;
  autoTitle: boolean;
  greetingMessage?: string;
  providerId?: string;
  personaId?: string;
  characterId?: string;
  styleItemId?: string;
  universeId?: string;
  worldbookIds: string[];
  tags: string[];
  lastReadAt: number;
  promptConfig: PromptConfig;
  generationSettings: ChatGenerationSettings;
  moduleOverrides?: ChatModuleOverrides;
};

export type ChatGenerationSettings = {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
};

export type PromptPresetId =
  | 'human'
  | 'casual-brief'
  | 'casual-lowercase'
  | 'strict-lowercase'
  | 'dialogue-only'
  | 'no-emoji'
  | 'first-person'
  | 'concise'
  | 'immersive'
  | 'initiative'
  | 'continuity'
  | 'roleplay-actions'
  | 'no-user-control'
  | 'character-consistency'
  | 'scene-pacing'
  | 'telegram-chat';

export type PromptPriority = 'low' | 'normal' | 'high' | 'critical';

export type ResponseLengthMode = 'auto' | 'micro' | 'short' | 'long';

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
  recentMessageLimit: number;
  responseLength: ResponseLengthMode;
  setIds: string[];
  presetIds: PromptPresetId[];
  contextPriorities: PromptContextPriorities;
  customBlocks: PromptBlock[];
};

export type ChatConfigInput = {
  title: string;
  autoTitle: boolean;
  automaticTitleBase?: string;
  greetingMessage?: string;
  providerId?: string;
  personaId?: string;
  characterId?: string;
  styleItemId?: string;
  universeId?: string;
  worldbookIds: string[];
  tags: string[];
  promptConfig: PromptConfig;
  generationSettings: ChatGenerationSettings;
  moduleOverrides: ChatModuleOverrides;
};

export type ContextReportSection = {
  id: string;
  title: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  included: boolean;
  approximateTokens: number;
  omittedReason?: string;
};

export type ContextReportTruncation = {
  id: string;
  before: number;
  after: number;
};

export type ContextReportUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type ContextReport = {
  createdAt: number;
  providerId: string;
  providerName: string;
  model: string;
  mode: 'send' | 'regenerate' | 'continue';
  latencyMs?: number;
  reportedUsage?: ContextReportUsage;
  estimatedTokens: {
    systemTokens: number;
    historyTokens: number;
    totalTokens: number;
  };
  sections: ContextReportSection[];
  promptRules: string[];
  truncations: ContextReportTruncation[];
  modules: {
    dynamicContext: boolean;
    dynamicContextAnalysis: boolean;
    semanticMemory: boolean;
    semanticMemorySelected: number;
    repetitionGuard: boolean;
    responseCleanup: string[];
  };
};

export type MessageVariant = {
  id: string;
  index: number;
  content: string;
  createdAt: number;
  edited?: boolean;
  report?: ContextReport;
  rating?: number;
  note?: string;
};

export type Message = {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  updatedAt?: number;
  edited?: boolean;
  remembered: boolean;
  activeVariantIndex: number;
  variants: MessageVariant[];
  pending?: boolean;
};

export type GenerationJob = {
  id: string;
  chatId: string;
  messageId: string;
  mode: 'send' | 'regenerate' | 'continue';
  status: 'running' | 'cancelling';
  startedAt: number;
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
  greetingMessage?: string;
  definitionSections: DefinitionSection[];
  stylePreset:
    | 'neutral'
    | 'warm'
    | 'concise'
    | 'short-messages'
    | 'long-messages'
    | 'casual-lowercase'
    | 'roleplay-rich'
    | 'telegram-human'
    | 'coherent-thought'
    | 'roleplay'
    | 'literary'
    | 'custom';
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

export type PromptPreviewScope = 'request' | 'contribution';

export type PromptPreviewInput = {
  scope?: PromptPreviewScope;
  persona?: GalaxyItemInput;
  character?: GalaxyItemInput;
  universe?: GalaxyItemInput;
  worldbooks: GalaxyItemInput[];
  characterStyle?: GalaxyItemInput;
  promptSets: GalaxyItemInput[];
  promptConfig: PromptConfig;
  rememberedMessages: Message[];
  conversationMessages: Message[];
  userName?: string;
  characterName?: string;
  responseLanguage?: 'en' | 'ru';
  contextBudget?: ContextBudgetSettings;
  repetitionGuard?: RepetitionGuardSettings;
  dynamicContextEnabled?: boolean;
  semanticMemoryEnabled?: boolean;
};

export type PromptPreviewRuntimeSection = 'dynamicContext' | 'semanticMemory';

export type PromptPreviewResult = {
  prompt: string;
  approximateTokens: number;
  baselineApproximateTokens: number;
  savedApproximateTokens: number;
  characters: number;
  runtimeVariableSections: PromptPreviewRuntimeSection[];
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
  apiKeys?: string[];
  /** Legacy Telescope v1 field accepted during import. */
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

export type ContextBudgetSettings = {
  enabled: boolean;
  maxCharacters: number;
  preserveRecentMessages: number;
  compactSystemPrompt: boolean;
  selectiveWorldbookEntries: boolean;
  worldbookScanMessages: number;
  maxWorldbookEntries: number;
  maxSystemCharacters: number;
};

export type RepetitionGuardSettings = {
  enabled: boolean;
  recentAssistantMessages: number;
  maxCharactersPerMessage: number;
};

export type ResponseCleanupSettings = {
  enabled: boolean;
  collapseBlankLines: boolean;
  removeDuplicatedTail: boolean;
};

export type AiModuleId =
  | 'retry'
  | 'dynamicContext'
  | 'semanticMemory'
  | 'contextBudget'
  | 'repetitionGuard'
  | 'responseCleanup';

export type ChatModuleOverrides = Partial<Record<AiModuleId, boolean>>;

export type AiModuleSettings = {
  retry: RetrySettings;
  dynamicContext: DynamicContextSettings;
  semanticMemory: SemanticMemorySettings;
  contextBudget: ContextBudgetSettings;
  repetitionGuard: RepetitionGuardSettings;
  responseCleanup: ResponseCleanupSettings;
};

export type BudgetSettings = {
  id: string;
  providerId?: string;
  period: 'day' | 'month';
  tokenLimit: number;
  requestLimit: number;
};

export type BudgetStatus = BudgetSettings & {
  ruleId: string;
  usedTokens: number;
  usedRequests: number;
  exceeded: boolean;
};

export type AppSettings = {
  profileName: string;
  profileAvatar?: string;
  animations: boolean;
  haptics: boolean;
  compactMode: boolean;
  sendOnEnter: boolean;
  focusComposerAfterSend: boolean;
  saveDrafts: boolean;
  chatViewMode: 'conversation' | 'bubbles' | 'messenger' | 'reading';
  showMessageAvatars: boolean;
  showMessageTimestamps: boolean;
  responseLanguage: 'app' | 'auto';
  setupComplete: boolean;
  budgets: BudgetSettings[];
  interfaceScale: number;
  sidebarWidth: number;
  chatSidebarWidth: number;
  sidebarCollapsed: boolean;
  themeMode: 'light' | 'dark' | 'system';
  themeVariant:
    | 'default'
    | 'lavender'
    | 'discord'
    | 'spotify'
    | 'mint'
    | 'uber'
    | 'rabbit'
    | 'catppuccin'
    | 'tokyo-night'
    | 'nord'
    | 'dracula'
    | 'rose-pine'
    | 'gruvbox'
    | 'solarized'
    | 'monochrome';
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

export type AppBackupPreview = {
  formatVersion: number;
  sourceAppVersion: string;
  createdAt: number;
  credentialsIncluded: boolean;
  credentialCount: number;
  chatCount: number;
  messageCount: number;
  variantCount: number;
  galaxyItemCount: number;
  providerCount: number;
  usageDayCount: number;
};

export type HealthTableCount = {
  name: string;
  rows: number;
};

export type HealthIssueSeverity = 'error' | 'warning' | 'info';

export type HealthIssue = {
  id: string;
  severity: HealthIssueSeverity;
  affected: number;
  repairable: boolean;
  samples: string[];
};

export type DatabaseHealthReport = {
  createdAt: number;
  appVersion: string;
  databaseSizeBytes: number;
  walSizeBytes: number;
  integrityOk: boolean;
  integrityMessages: string[];
  foreignKeyViolations: number;
  tables: HealthTableCount[];
  issues: HealthIssue[];
};

export type HealthRepairAction = {
  issueId: string;
  affected: number;
};

export type HealthRepairReport = {
  repairedAt: number;
  actions: HealthRepairAction[];
  report: DatabaseHealthReport;
};

export type EntityRevision = {
  id: string;
  kind: 'galaxy' | 'message' | string;
  entityId: string;
  origin: 'edit' | 'import' | 'restore' | string;
  createdAt: number;
  payload: Record<string, unknown>;
};

export type EntityRestoreResult = {
  item?: GalaxyItem;
};

export type ProviderModelResult = {
  models: string[];
  latencyMs: number;
};

export type EmbeddingProbeResult = {
  dimensions: number;
  latencyMs: number;
};
