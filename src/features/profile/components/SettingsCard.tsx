import type { ReactNode } from 'react';
import type { IconName } from '../../../components/Icon';
import { AppIconTile } from '../../../components/ui/AppIconTile';
import { AppPanel } from '../../../components/ui/AppPanel';

export function SettingsCard({
  icon,
  title,
  description,
  children,
}: {
  icon: IconName;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <AppPanel className="settings-card-enter w-full min-w-0 max-w-full overflow-hidden p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <AppIconTile icon={icon} />
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          <p className="section-description">{description}</p>
        </div>
      </div>
      <div className="mt-4 divide-y divide-separator">{children}</div>
    </AppPanel>
  );
}
