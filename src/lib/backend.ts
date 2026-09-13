import { Channel, invoke } from '@tauri-apps/api/core';
import { i18next } from '../i18n';
import { getBackendErrorPayload, localizeBackendError } from '../i18n/backend';
import type {
  AppBackupPreview,
  AppSettings,
  AppSnapshot,
  ChatConfigInput,
  ChatState,
  BudgetStatus,
  DatabaseHealthReport,
  EntityRestoreResult,
  EntityRevision,
  VariantFeedback,
  GenerationJob,
  GalaxyItem,
  EmbeddingProbeResult,
  GalaxyItemInput,
  HealthRepairReport,
  Provider,
  ProviderImportInput,
  ProviderInput,
  ProviderModelResult,
  PromptPreviewInput,
  PromptPreviewResult,
  UsagePoint,
} from '../types';

export class BackendCommandError extends Error {
  readonly key?: string;
  readonly variables: Record<string, string | number>;

  constructor(
    message: string,
    key: string | undefined,
    variables: Record<string, string | number> | undefined,
    cause: unknown,
  ) {
    super(message, { cause });
    this.name = 'BackendCommandError';
    this.key = key;
    this.variables = variables ?? {};
  }
}

export function isBackendCommandError(
  error: unknown,
  key: string,
): error is BackendCommandError {
  return error instanceof BackendCommandError && error.key === key;
}

export function backendErrorHasVariable(
  error: unknown,
  name: string,
  value: string,
) {
  return (
    error instanceof BackendCommandError &&
    String(error.variables[name]) === value
  );
}

function requireTauri() {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    throw new Error(i18next.t('errors.tauriUnavailable'));
  }
}

async function invokeBackend<T>(
  command: string,
  args?: Record<string, unknown>,
) {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const payload = getBackendErrorPayload(error);
    throw new BackendCommandError(
      localizeBackendError(error),
      payload?.key,
      payload?.variables,
      error,
    );
  }
}

export async function loadSnapshot(): Promise<AppSnapshot> {
  requireTauri();
  return invokeBackend<AppSnapshot>('get_app_snapshot');
}

export async function loadUsageHistory(): Promise<UsagePoint[]> {
  requireTauri();
  return invokeBackend<UsagePoint[]>('get_usage_history');
}

export async function getBudgetStatus(): Promise<BudgetStatus[]> {
  requireTauri();
  return invokeBackend<BudgetStatus[]>('get_budget_status');
}

export async function createAppBackup(includeCredentials: boolean) {
  requireTauri();
  return invokeBackend<unknown>('create_app_backup', { includeCredentials });
}

export async function inspectAppBackup(
  archive: unknown,
): Promise<AppBackupPreview> {
  requireTauri();
  return invokeBackend<AppBackupPreview>('inspect_app_backup', { archive });
}

export async function restoreAppBackup(archive: unknown): Promise<AppSnapshot> {
  requireTauri();
  return invokeBackend<AppSnapshot>('restore_app_backup', { archive });
}

export async function runDatabaseDiagnostics(): Promise<DatabaseHealthReport> {
  requireTauri();
  return invokeBackend<DatabaseHealthReport>('run_database_diagnostics');
}

export async function repairDatabaseIssues(): Promise<HealthRepairReport> {
  requireTauri();
  return invokeBackend<HealthRepairReport>('repair_database_issues');
}

export async function loadChatState(chatId: string): Promise<ChatState> {
  requireTauri();
  return invokeBackend<ChatState>('get_chat_state', { chatId });
}

export async function cancelGeneration(generationId: string) {
  requireTauri();
  return invokeBackend<boolean>('cancel_generation', { generationId });
}

export async function cancelChatGeneration(chatId: string) {
  requireTauri();
  return invokeBackend<number>('cancel_chat_generation', { chatId });
}

export async function listGenerationJobs() {
  requireTauri();
  return invokeBackend<GenerationJob[]>('list_generation_jobs');
}

export async function createChat(input: ChatConfigInput) {
  requireTauri();
  return invokeBackend<{ id: string; title: string }>('create_chat', { input });
}

export async function updateChatConfig(chatId: string, input: ChatConfigInput) {
  requireTauri();
  return invokeBackend<void>('update_chat_config', { chatId, input });
}

export async function renameChat(chatId: string, title: string) {
  requireTauri();
  return invokeBackend<void>('rename_chat', { chatId, title });
}

export async function deleteChat(chatId: string) {
  requireTauri();
  return invokeBackend<void>('delete_chat', { chatId });
}

export async function setChatPinned(chatId: string, pinned: boolean) {
  requireTauri();
  return invokeBackend<void>('set_chat_pinned', { chatId, pinned });
}

export async function setChatArchived(chatId: string, archived: boolean) {
  requireTauri();
  return invokeBackend<void>('set_chat_archived', { chatId, archived });
}

export async function markChatRead(chatId: string) {
  requireTauri();
  return invokeBackend<number>('mark_chat_read', { chatId });
}

export async function assignChatTags(
  chatIds: string[],
  addTags: string[],
  removeTags: string[],
) {
  requireTauri();
  return invokeBackend<number>('assign_chat_tags', {
    chatIds,
    addTags,
    removeTags,
  });
}

export async function clearChat(chatId: string) {
  requireTauri();
  return invokeBackend<void>('clear_chat', { chatId });
}

export type GenerationStreamDelta = {
  messageId: string;
  delta: string;
};

function streamChannel(
  onDelta: ((delta: GenerationStreamDelta) => void) | undefined,
): Channel<GenerationStreamDelta> {
  const channel = new Channel<GenerationStreamDelta>();
  if (onDelta) channel.onmessage = onDelta;
  return channel;
}

export async function sendChatMessage(
  chatId: string,
  content: string,
  generationId: string,
  userMessageId: string,
  assistantMessageId: string,
  responseLanguage?: 'en' | 'ru',
  onDelta?: (delta: GenerationStreamDelta) => void,
) {
  requireTauri();
  return invokeBackend<void>('send_chat_message', {
    channel: streamChannel(onDelta),
    chatId,
    content,
    generationId,
    userMessageId,
    assistantMessageId,
    responseLanguage: responseLanguage ?? null,
  });
}

export async function cloneChat(
  chatId: string,
  title: string,
  includeMessages: boolean,
  input?: ChatConfigInput,
) {
  requireTauri();
  return invokeBackend<{ id: string; title: string }>('clone_chat', {
    chatId,
    title,
    includeMessages,
    input: input ?? null,
  });
}

export async function branchChat(messageId: string, title: string) {
  requireTauri();
  return invokeBackend<{ id: string; title: string }>('branch_chat', {
    messageId,
    title,
  });
}

export async function editMessage(messageId: string, content: string) {
  requireTauri();
  return invokeBackend<void>('edit_message', { messageId, content });
}

export async function deleteMessage(messageId: string) {
  requireTauri();
  return invokeBackend<void>('delete_message', { messageId });
}

export async function deleteMessages(messageIds: string[]) {
  requireTauri();
  return invokeBackend<void>('delete_messages', { messageIds });
}

export async function rewindChatToMessage(messageId: string) {
  requireTauri();
  return invokeBackend<void>('rewind_chat_to_message', { messageId });
}

export async function setMessageRemembered(
  messageId: string,
  remembered: boolean,
) {
  requireTauri();
  return invokeBackend<void>('set_message_remembered', {
    messageId,
    remembered,
  });
}

export async function selectMessageVariant(
  messageId: string,
  variantIndex: number,
) {
  requireTauri();
  return invokeBackend<void>('select_message_variant', {
    messageId,
    variantIndex,
  });
}

export async function rateMessageVariant(
  messageId: string,
  variantIndex: number,
  rating: number | null,
  note: string | null,
) {
  requireTauri();
  return invokeBackend<void>('rate_message_variant', {
    messageId,
    variantIndex,
    rating,
    note,
  });
}

export async function regenerateMessage(
  messageId: string,
  generationId: string,
  responseLanguage?: 'en' | 'ru',
  onDelta?: (delta: GenerationStreamDelta) => void,
) {
  requireTauri();
  return invokeBackend<void>('regenerate_message', {
    channel: streamChannel(onDelta),
    messageId,
    generationId,
    responseLanguage: responseLanguage ?? null,
  });
}

export async function continueMessage(
  messageId: string,
  generationId: string,
  responseLanguage?: 'en' | 'ru',
  onDelta?: (delta: GenerationStreamDelta) => void,
) {
  requireTauri();
  return invokeBackend<void>('continue_message', {
    channel: streamChannel(onDelta),
    messageId,
    generationId,
    responseLanguage: responseLanguage ?? null,
  });
}

export async function listEntityRevisions(
  kind: 'galaxy' | 'message',
  entityId: string,
): Promise<EntityRevision[]> {
  requireTauri();
  return invokeBackend<EntityRevision[]>('list_entity_revisions', {
    kind,
    entityId,
  });
}

export async function listVariantFeedback(
  entityId: string,
): Promise<VariantFeedback[]> {
  requireTauri();
  return invokeBackend<VariantFeedback[]>('list_variant_feedback', {
    entityId,
  });
}

export async function restoreEntityRevision(
  kind: 'galaxy' | 'message',
  entityId: string,
  revisionId: string,
): Promise<EntityRestoreResult> {
  requireTauri();
  return invokeBackend<EntityRestoreResult>('restore_entity_revision', {
    kind,
    entityId,
    revisionId,
  });
}

export async function previewPrompt(input: PromptPreviewInput) {
  requireTauri();
  return invokeBackend<PromptPreviewResult>('preview_prompt', { input });
}

export async function upsertGalaxyItem(input: GalaxyItemInput) {
  requireTauri();
  return invokeBackend<GalaxyItem>('upsert_galaxy_item', { input });
}

export async function deleteGalaxyItem(id: string) {
  requireTauri();
  return invokeBackend<void>('delete_galaxy_item', { id });
}

export async function importGalaxyItems(inputs: GalaxyItemInput[]) {
  requireTauri();
  return invokeBackend<number>('import_galaxy_items', { inputs });
}

export async function fetchProviderModels(
  provider: ProviderInput,
  apiKey?: string,
): Promise<ProviderModelResult> {
  requireTauri();
  return invokeBackend<ProviderModelResult>('fetch_provider_models', {
    provider,
    apiKey: apiKey || null,
  });
}

export async function testProviderEmbeddings(
  provider: ProviderInput,
  apiKey?: string,
): Promise<EmbeddingProbeResult> {
  requireTauri();
  return invokeBackend<EmbeddingProbeResult>('test_provider_embeddings', {
    provider,
    apiKey: apiKey || null,
  });
}

export async function saveProvider(
  provider: ProviderInput,
  apiKey?: string,
): Promise<Provider> {
  requireTauri();
  return invokeBackend<Provider>('save_provider', {
    provider,
    apiKey: apiKey || null,
  });
}

export async function exportProviderSecrets(ids: string[]) {
  requireTauri();
  return invokeBackend<Record<string, string[]>>('export_provider_secrets', {
    providerIds: ids,
  });
}

export async function importProviderConnections(
  entries: ProviderImportInput[],
) {
  requireTauri();
  return invokeBackend<number>('import_providers', { entries });
}

export async function checkProvider(id: string): Promise<Provider> {
  requireTauri();
  return invokeBackend<Provider>('check_provider', { id });
}

export async function deleteProvider(id: string) {
  requireTauri();
  return invokeBackend<void>('delete_provider', { id });
}

export async function updateSettings(settings: AppSettings) {
  requireTauri();
  return invokeBackend<AppSettings>('update_app_settings', { settings });
}
