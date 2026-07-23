import { invoke } from '@tauri-apps/api/core';
import type {
  AppSettings,
  AppSnapshot,
  GalaxyItem,
  GalaxyItemInput,
  Provider,
  ProviderInput,
  ProviderModelResult,
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

export async function createChat(title: string) {
  requireTauri();
  return invoke<{ id: string; title: string }>('create_chat', { title });
}

export async function setChatProvider(chatId: string, providerId?: string) {
  requireTauri();
  return invoke<void>('set_chat_provider', {
    chatId,
    providerId: providerId || null,
  });
}

export async function sendChatMessage(
  chatId: string,
  providerId: string,
  content: string,
) {
  requireTauri();
  return invoke<void>('send_chat_message', { chatId, providerId, content });
}

export async function upsertGalaxyItem(input: GalaxyItemInput) {
  requireTauri();
  return invoke<GalaxyItem>('upsert_galaxy_item', { input });
}

export async function deleteGalaxyItem(id: string) {
  requireTauri();
  return invoke<void>('delete_galaxy_item', { id });
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
