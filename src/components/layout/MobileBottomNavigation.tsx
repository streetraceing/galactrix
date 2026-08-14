import { navigationItems } from '../../app/navigation';
import { cn } from '../../lib/cn';
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
      className="mobile-navigation"
      aria-label={t('mobileBottomNavigation.mobileNavigation')}
    >
      <div className="mobile-navigation__grid">
        {navigationItems.map((item) => {
          const isActive = activeTab === item.id;
          const label = t(item.labelKey);

          return (
            <button
              type="button"
              key={item.id}
              className={cn(
                'mobile-navigation__item group',
                isActive && 'mobile-navigation__item--active',
              )}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              data-active={isActive || undefined}
              onClick={() => onNavigate(item.id)}
            >
              <span className="mobile-navigation__icon">
                {item.id === 'profile' ? (
                  <AppAvatar
                    src={profileAvatar}
                    name={profileName}
                    className="size-5"
                  />
                ) : (
                  <Icon name={item.icon} className="size-5 shrink-0" />
                )}
              </span>
              <span className="mobile-navigation__label">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
