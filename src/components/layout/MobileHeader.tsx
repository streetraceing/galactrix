import { Button } from '@heroui/react';
import type { TabId } from '../../types';
import { BrandMark } from '../BrandMark';
import { Icon } from '../Icon';

export function MobileHeader({
  title,
  activeTab,
  onNewChat,
}: {
  title: string;
  activeTab: TabId;
  onNewChat: () => void;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-separator bg-surface px-3 md:hidden">
      <BrandMark size={32} />
      <strong className="min-w-0 flex-1 truncate text-sm">{title}</strong>
      {activeTab === 'chats' ? (
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Новый чат"
          onPress={onNewChat}
        >
          <Icon name="plus" className="size-5" />
        </Button>
      ) : (
        <span className="size-8" aria-hidden="true" />
      )}
    </header>
  );
}
