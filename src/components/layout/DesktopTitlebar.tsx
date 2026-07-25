import { Button, Input, Surface } from '@heroui/react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { navigationItems } from '../../app/navigation';
import { isMobilePlatform } from '../../lib/platform';
import type { Chat, TabId } from '../../types';
import { BrandMark } from '../BrandMark';
import { Icon } from '../Icon';
import type { IconName } from '../Icon';

type Command = {
  id: string;
  label: string;
  hint: string;
  icon: IconName;
  run: () => void;
};

export function DesktopTitlebar({
  activeTab,
  chats,
  onNavigate,
  onOpenChat,
}: {
  activeTab: TabId;
  chats: Chat[];
  onNavigate: (tab: TabId) => void;
  onOpenChat: (chatId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const isMobile = isMobilePlatform();
  const appWindow = getCurrentWindow();

  const commands = useMemo<Command[]>(
    () => [
      {
        id: 'new-chat',
        label: 'Начать новый чат',
        hint: 'Создать чат с провайдером и ролевым контекстом',
        icon: 'plus',
        run: () => {
          onNavigate('chats');
          window.setTimeout(
            () => window.dispatchEvent(new Event('galactrix:new-chat')),
            0,
          );
        },
      },
      ...navigationItems.map((item) => ({
        id: item.id,
        label: `Открыть: ${item.label}`,
        hint: item.id === activeTab ? 'Текущая вкладка' : 'Перейти к разделу',
        icon: item.icon,
        run: () => onNavigate(item.id),
      })),
      ...chats.slice(0, 50).map((chat) => ({
        id: `chat-${chat.id}`,
        label: chat.title,
        hint: chat.preview || 'Открыть чат',
        icon: 'chats' as const,
        run: () => onOpenChat(chat.id),
      })),
    ],
    [activeTab, chats, onNavigate, onOpenChat],
  );

  useEffect(() => {
    if (isMobile) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          '[data-command-search="true"] input',
        );
        input?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        commands[0]?.run();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commands, isMobile]);

  if (isMobile) return null;

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? commands.filter((command) =>
        `${command.label} ${command.hint}`.toLowerCase().includes(normalized),
      )
    : commands;

  const run = (command: Command) => {
    command.run();
    setQuery('');
    setFocused(false);
  };

  const toggleMaximize = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, [role="button"], [role="listbox"]')) {
      return;
    }
    void appWindow.toggleMaximize();
  };

  return (
    <header
      data-tauri-drag-region
      className="relative z-50 flex h-11 shrink-0 items-center border-b border-separator bg-surface px-2"
      onDoubleClick={toggleMaximize}
    >
      <div
        data-tauri-drag-region
        className="flex min-w-32 items-center gap-2 px-1 sm:min-w-40"
      >
        <BrandMark size={24} />
        <span className="hidden text-xs font-semibold min-[760px]:inline">
          Galactrix
        </span>
      </div>

      <div
        data-command-search="true"
        className="absolute left-1/2 top-1/2 w-[min(34rem,46vw)] -translate-x-1/2 -translate-y-1/2 max-[760px]:w-[min(18rem,42vw)]"
      >
        <Input
          size="sm"
          variant="secondary"
          value={query}
          placeholder="Поиск и команды"
          aria-label="Поиск и команды"
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && filtered[0]) run(filtered[0]);
            if (event.key === 'Escape') {
              setQuery('');
              setFocused(false);
              event.currentTarget.blur();
            }
          }}
        />
        {focused ? (
          <Surface className="absolute inset-x-0 top-[calc(100%+0.4rem)] overflow-hidden rounded-xl border border-separator p-1 shadow-lg">
            {filtered.slice(0, 6).map((command) => (
              <Button
                key={command.id}
                fullWidth
                variant="ghost"
                className="h-auto justify-start gap-3 px-3 py-2 text-left"
                onPress={() => run(command)}
              >
                <Icon name={command.icon} className="size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {command.label}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {command.hint}
                  </span>
                </span>
              </Button>
            ))}
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted">Команды не найдены</p>
            ) : null}
          </Surface>
        ) : null}
      </div>

      <div className="ml-auto flex h-full items-center">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="h-full rounded-none"
          aria-label="Свернуть окно"
          onPress={() => void appWindow.minimize()}
        >
          <Icon name="minimize" className="size-4" />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="h-full rounded-none"
          aria-label="Развернуть окно"
          onPress={() => void appWindow.toggleMaximize()}
        >
          <Icon name="maximize" className="size-3.5" />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="h-full rounded-none hover:bg-danger hover:text-danger-foreground"
          aria-label="Закрыть окно"
          onPress={() => void appWindow.close()}
        >
          <Icon name="close" className="size-4" />
        </Button>
      </div>
    </header>
  );
}
