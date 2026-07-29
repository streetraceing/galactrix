import type { TabId } from '../types';
import { i18next } from '../i18n';

export type NavigationItem = {
  id: TabId;
  label: string;
  icon: 'chats' | 'galaxies' | 'telescope' | 'profile' | 'settings';
};

export const primaryNavigationItems: NavigationItem[] = [
  {
    id: 'chats',
    get label() {
      return i18next.t('navigation.chats');
    },
    icon: 'chats',
  },
  {
    id: 'galaxies',
    get label() {
      return i18next.t('navigation.galaxies');
    },
    icon: 'galaxies',
  },
  {
    id: 'telescope',
    get label() {
      return i18next.t('navigation.telescope');
    },
    icon: 'telescope',
  },
  {
    id: 'profile',
    get label() {
      return i18next.t('navigation.profile');
    },
    icon: 'profile',
  },
];

export const settingsNavigationItem: NavigationItem = {
  id: 'settings',
  get label() {
    return i18next.t('navigation.settings');
  },
  icon: 'settings',
};

export const navigationItems: NavigationItem[] = [
  ...primaryNavigationItems,
  settingsNavigationItem,
];
