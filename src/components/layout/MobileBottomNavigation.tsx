import { navigationItems } from '../../app/navigation';
import type { TabId } from '../../types';
import { Icon } from '../Icon';
import { AppAvatar } from '../ui/AppAvatar';
import { useTranslation } from 'react-i18next';

export function MobileBottomNavigation({
  activeTab,
  profileName,
  profileAvatar,
  onNavigate,
}: {
  activeTab: TabId;
  profileName: string;
  profileAvatar?: string;
  onNavigate: (tab: TabId) => void;
}) {
  const { t } = useTranslation('common');
  return (
    <nav
      className="shrink-0 border-t border-separator bg-surface pb-[env(safe-area-inset-bottom)]"
      aria-label={t('mobileBottomNavigation.mobileNavigation')}
    >
      <div className="grid h-16 w-full grid-cols-5">
        {navigationItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              type="button"
              key={item.id}
              className={`group relative flex h-full min-w-0 flex-col items-center justify-center gap-1 border-0 bg-transparent px-1 outline-none transition-colors duration-[var(--motion-standard)] ease-[var(--motion-ease)] active:bg-default/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ${
                isActive ? 'text-accent' : 'text-muted'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <span
                className={`absolute inset-x-4 top-0 h-0.5 origin-center rounded-b-full bg-accent transition-transform duration-[var(--motion-standard)] ease-[var(--motion-ease)] ${
                  isActive ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
              {item.id === 'profile' ? (
                <AppAvatar
                  src={profileAvatar}
                  name={profileName}
                  className={`size-5 transition-transform duration-[var(--motion-standard)] ease-[var(--motion-ease)] group-active:scale-90 ${
                    isActive ? '-translate-y-0.5 scale-105' : ''
                  }`}
                />
              ) : (
                <Icon
                  name={item.icon}
                  className={`size-5 shrink-0 transition-transform duration-[var(--motion-standard)] ease-[var(--motion-ease)] group-active:scale-90 ${
                    isActive ? '-translate-y-0.5 scale-105' : ''
                  }`}
                />
              )}
              <span className="block w-full truncate text-center text-[0.68rem] font-medium leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
