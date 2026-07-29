import { invoke } from '@tauri-apps/api/core';
import type {
  AppSettings,
  AppSnapshot,
  ChatConfigInput,
  GalaxyItem,
  GalaxyItemInput,
  Provider,
  ProviderImportInput,
  ProviderInput,
  ProviderModelResult,
  PromptPreviewInput,
  PromptPreviewResult,
} from '../types';

function requireTauri() {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    throw new Error('Приложение запущено без Tauri backend');
  }
}

export async function loadSnapshot(): Promise<AppSnapshot> {
  requireTauri();
  return invoke<AppSnapshot>('get_app_snapshot');
}

export async function createChat(input: ChatConfigInput) {
  requireTauri();
  return invoke<{ id: string; title: string }>('create_chat', { input });
}

export async function updateChatConfig(chatId: string, input: ChatConfigInput) {
  requireTauri();
  return invoke<void>('update_chat_config', { chatId, input });
}

export async function renameChat(chatId: string, title: string) {
  requireTauri();
  return invoke<void>('rename_chat', { chatId, title });
}

export async function deleteChat(chatId: string) {
  requireTauri();
  return invoke<void>('delete_chat', { chatId });
}

export async function setChatPinned(chatId: string, pinned: boolean) {
  requireTauri();
  return invoke<void>('set_chat_pinned', { chatId, pinned });
}

export async function clearChat(chatId: string) {
  requireTauri();
  return invoke<void>('clear_chat', { chatId });
}

export async function sendChatMessage(chatId: string, content: string) {
  requireTauri();
  return invoke<void>('send_chat_message', { chatId, content });
}

export async function cloneChat(
  chatId: string,
  includeMessages: boolean,
  input?: ChatConfigInput,
) {
  requireTauri();
  return invoke<{ id: string; title: string }>('clone_chat', {
    chatId,
    includeMessages,
    input: input ?? null,
  });
}

export async function branchChat(messageId: string) {
  requireTauri();
  return invoke<{ id: string; title: string }>('branch_chat', { messageId });
}

export async function editMessage(messageId: string, content: string) {
  requireTauri();
  return invoke<void>('edit_message', { messageId, content });
}

export async function deleteMessage(messageId: string) {
  requireTauri();
  return invoke<void>('delete_message', { messageId });
}

export async function setMessageRemembered(
  messageId: string,
  remembered: boolean,
) {
  requireTauri();
  return invoke<void>('set_message_remembered', { messageId, remembered });
}

export async function selectMessageVariant(
  messageId: string,
  variantIndex: number,
) {
  requireTauri();
  return invoke<void>('select_message_variant', { messageId, variantIndex });
}

export async function regenerateMessage(messageId: string) {
  requireTauri();
  return invoke<void>('regenerate_message', { messageId });
}

export async function previewPrompt(input: PromptPreviewInput) {
  requireTauri();
  return invoke<PromptPreviewResult>('preview_prompt', { input });
}

export async function upsertGalaxyItem(input: GalaxyItemInput) {
  requireTauri();
  return invoke<GalaxyItem>('upsert_galaxy_item', { input });
}

export async function deleteGalaxyItem(id: string) {
  requireTauri();
  return invoke<void>('delete_galaxy_item', { id });
}

export async function importGalaxyItems(inputs: GalaxyItemInput[]) {
  requireTauri();
  return invoke<number>('import_galaxy_items', { inputs });
}

export async function fetchProviderModels(
  provider: ProviderInput,
  apiKey?: string,
): Promise<ProviderModelResult> {
  requireTauri();
  return invoke<ProviderModelResult>('fetch_provider_models', {
    provider,
    apiKey: apiKey || null,
  });
}

export async function saveProvider(
  provider: ProviderInput,
  apiKey?: string,
): Promise<Provider> {
  requireTauri();
  return invoke<Provider>('save_provider', {
    provider,
    apiKey: apiKey || null,
  });
}

export async function exportProviderSecrets(ids: string[]) {
  requireTauri();
  return invoke<Record<string, string>>('export_provider_secrets', {
    providerIds: ids,
  });
}

export async function importProviderConnections(
  entries: ProviderImportInput[],
) {
  requireTauri();
  return invoke<number>('import_providers', { entries });
}

export async function checkProvider(id: string): Promise<Provider> {
  requireTauri();
  return invoke<Provider>('check_provider', { id });
}

export async function deleteProvider(id: string) {
  requireTauri();
  return invoke<void>('delete_provider', { id });
}

export async function updateSettings(settings: AppSettings) {
  requireTauri();
  return invoke<AppSettings>('update_app_settings', { settings });
}
