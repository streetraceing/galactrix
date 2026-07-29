import type { TabId } from '../types';

export type NavigationItem = {
  id: TabId;
  label: string;
  icon: 'chats' | 'galaxies' | 'telescope' | 'profile' | 'settings';
};

export const primaryNavigationItems: NavigationItem[] = [
  { id: 'chats', label: 'Чаты', icon: 'chats' },
  { id: 'galaxies', label: 'Галактики', icon: 'galaxies' },
  { id: 'telescope', label: 'Телескоп', icon: 'telescope' },
  { id: 'profile', label: 'Профиль', icon: 'profile' },
];

export const settingsNavigationItem: NavigationItem = {
  id: 'settings',
  label: 'Настройки',
  icon: 'settings',
};

export const navigationItems: NavigationItem[] = [
  ...primaryNavigationItems,
  settingsNavigationItem,
];
