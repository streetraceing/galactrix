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
  const [maximized, setMaximized] = useState(false);
  const isMobile = isMobilePlatform();
  const appWindow = useMemo(() => getCurrentWindow(), []);

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

  useEffect(() => {
    if (isMobile) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const sync = () => {
      void appWindow
        .isMaximized()
        .then((value) => !disposed && setMaximized(value))
        .catch(() => undefined);
    };
    sync();
    void appWindow.onResized(sync).then((next) => {
      if (disposed) next();
      else unlisten = next;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [appWindow, isMobile]);

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

  const toggleWindowMaximize = async () => {
    await appWindow.toggleMaximize();
    setMaximized(await appWindow.isMaximized());
  };

  return (
    <header
      data-tauri-drag-region
      className="relative z-50 flex h-11 shrink-0 items-center border-b border-separator bg-surface pl-2"
      onDoubleClick={toggleMaximize}
    >
      <div
        data-tauri-drag-region
        className="flex min-w-0 items-center gap-2 pr-2"
      >
        <BrandMark size={24} />
        <span className="hidden truncate text-xs font-semibold min-[760px]:block">
          Galactrix
        </span>
      </div>

      <div
        data-command-search="true"
        className="absolute left-1/2 top-1/2 w-[min(54vw,48rem)] min-w-64 -translate-x-1/2 -translate-y-1/2"
      >
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted"
        />
        <Input
          fullWidth
          size="sm"
          variant="secondary"
          value={query}
          placeholder="Поиск по чатам и команды"
          aria-label="Поиск и команды"
          className="[&_input]:pl-9 [&_input]:pr-24"
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
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-[0.625rem] font-semibold text-muted min-[720px]:flex">
          <span className="rounded border border-separator bg-surface px-1.5 py-0.5 shadow-sm">
            Ctrl
          </span>
          <span className="rounded border border-separator bg-surface px-1.5 py-0.5 shadow-sm">
            K
          </span>
        </kbd>
        {focused ? (
          <Surface className="absolute inset-x-0 top-[calc(100%+0.4rem)] overflow-hidden rounded-xl border border-separator p-1 shadow-lg">
            {filtered.slice(0, 7).map((command) => (
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

      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="h-full w-12 min-w-12 rounded-none"
          aria-label="Свернуть окно"
          onPress={() => void appWindow.minimize()}
        >
          <Icon name="minimize" className="size-4" />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="h-full w-12 min-w-12 rounded-none"
          aria-label={maximized ? 'Восстановить окно' : 'Развернуть окно'}
          onPress={() => void toggleWindowMaximize()}
        >
          <Icon
            name={maximized ? 'restore' : 'maximize'}
            className="size-3.5"
          />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="h-full w-12 min-w-12 rounded-none hover:bg-danger hover:text-danger-foreground"
          aria-label="Закрыть окно"
          onPress={() => void appWindow.close()}
        >
          <Icon name="close" className="size-4" />
        </Button>
      </div>
    </header>
  );
}
