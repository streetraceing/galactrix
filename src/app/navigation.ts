import type { TabId } from '../types';

export type NavigationLabelKey =
  | 'navigation.chats'
  | 'navigation.galaxies'
  | 'navigation.telescope'
  | 'navigation.profile'
  | 'navigation.settings';

export type NavigationItem = {
  id: TabId;
  labelKey: NavigationLabelKey;
  icon: 'chats' | 'galaxies' | 'telescope' | 'profile' | 'settings';
};

export const primaryNavigationItems: NavigationItem[] = [
  {
    id: 'chats',
    labelKey: 'navigation.chats',
    icon: 'chats',
  },
  {
    id: 'galaxies',
    labelKey: 'navigation.galaxies',
    icon: 'galaxies',
  },
  {
    id: 'telescope',
    labelKey: 'navigation.telescope',
    icon: 'telescope',
  },
  {
    id: 'profile',
    labelKey: 'navigation.profile',
    icon: 'profile',
  },
];

export const settingsNavigationItem: NavigationItem = {
  id: 'settings',
  labelKey: 'navigation.settings',
  icon: 'settings',
};

export const navigationItems: NavigationItem[] = [
  ...primaryNavigationItems,
  settingsNavigationItem,
];
