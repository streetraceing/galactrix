import { invoke } from '@tauri-apps/api/core';
import { i18next } from '../i18n';
import { getBackendErrorPayload, localizeBackendError } from '../i18n/backend';
import type {
  AppSettings,
  AppSnapshot,
  ChatConfigInput,
  ChatState,
  GalaxyItem,
  EmbeddingProbeResult,
  GalaxyItemInput,
  Provider,
  ProviderImportInput,
  ProviderInput,
  ProviderModelResult,
  PromptPreviewInput,
  PromptPreviewResult,
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

export async function loadChatState(chatId: string): Promise<ChatState> {
  requireTauri();
  return invokeBackend<ChatState>('get_chat_state', { chatId });
}

export async function cancelGeneration(generationId: string) {
  requireTauri();
  return invokeBackend<boolean>('cancel_generation', { generationId });
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

export async function clearChat(chatId: string) {
  requireTauri();
  return invokeBackend<void>('clear_chat', { chatId });
}

export async function sendChatMessage(
  chatId: string,
  content: string,
  generationId: string,
  userMessageId: string,
  assistantMessageId: string,
  responseLanguage?: 'en' | 'ru',
) {
  requireTauri();
  return invokeBackend<void>('send_chat_message', {
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

export async function regenerateMessage(
  messageId: string,
  generationId: string,
  responseLanguage?: 'en' | 'ru',
) {
  requireTauri();
  return invokeBackend<void>('regenerate_message', {
    messageId,
    generationId,
    responseLanguage: responseLanguage ?? null,
  });
}

export async function continueMessage(
  messageId: string,
  generationId: string,
  responseLanguage?: 'en' | 'ru',
) {
  requireTauri();
  return invokeBackend<void>('continue_message', {
    messageId,
    generationId,
    responseLanguage: responseLanguage ?? null,
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
