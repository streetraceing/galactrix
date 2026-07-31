import { Surface } from '@heroui/react';
import type { ReactNode } from 'react';
import { Icon } from '../../../components/Icon';

type SettingsIcon = 'settings' | 'chats' | 'profile';

export function SettingsCard({
  icon,
  title,
  description,
  children,
}: {
  icon: SettingsIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Surface className="settings-card-enter w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-separator bg-surface p-4 shadow-surface ring-1 ring-inset ring-foreground/5 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icon name={icon} className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          <p className="section-description">{description}</p>
        </div>
      </div>
      <div className="mt-4 divide-y divide-separator">{children}</div>
    </Surface>
  );
}
