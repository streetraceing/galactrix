import { invoke } from '@tauri-apps/api/core';
import { mockSnapshot } from '../data';
import type { AppSettings, AppSnapshot, GalaxyItem, Provider } from '../types';

const inTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function loadSnapshot(): Promise<AppSnapshot> {
  if (!inTauri()) return structuredClone(mockSnapshot);

  try {
    return await invoke<AppSnapshot>('get_app_snapshot');
  } catch (error) {
    console.warn('Rust backend is not ready, using preview data:', error);
    return structuredClone(mockSnapshot);
  }
}

export async function createChat(title: string) {
  if (!inTauri()) return { id: crypto.randomUUID(), title };
  return invoke<{ id: string; title: string }>('create_chat', { title });
}

export async function addMessage(
  chatId: string,
  role: 'user' | 'assistant',
  content: string,
) {
  if (!inTauri()) return { id: crypto.randomUUID(), chatId, role, content };
  return invoke('add_message', { chatId, role, content });
}

export async function saveGalaxyItem(item: GalaxyItem) {
  if (!inTauri()) return item;
  return invoke<GalaxyItem>('save_galaxy_item', { item });
}

export async function saveProvider(provider: Provider, apiKey?: string) {
  if (!inTauri()) return provider;
  return invoke<Provider>('save_provider', {
    provider,
    apiKey: apiKey || null,
  });
}

export async function updateSettings(settings: AppSettings) {
  if (!inTauri()) return settings;
  return invoke<AppSettings>('update_app_settings', { settings });
}
