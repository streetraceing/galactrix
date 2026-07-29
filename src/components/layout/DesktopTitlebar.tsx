import { Button, Kbd, SearchField, Surface } from '@heroui/react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  shortcut?: string;
  run: () => void;
};

export function DesktopTitlebar({
  activeTab,
  chats,
  onNavigate,
  onOpenChat,
  onToggleSidebar,
}: {
  activeTab: TabId;
  chats: Chat[];
  onNavigate: (tab: TabId) => void;
  onOpenChat: (chatId: string) => void;
  onToggleSidebar: () => void;
}) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isMobile = isMobilePlatform();
  const appWindow = useMemo(() => getCurrentWindow(), []);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: 'new-chat',
        label: 'Начать новый чат',
        hint: 'Создать чат с провайдером и ролевым контекстом',
        icon: 'plus',
        shortcut: 'Ctrl+N',
        run: () => {
          onNavigate('chats');
          window.setTimeout(
            () => window.dispatchEvent(new Event('galactrix:new-chat')),
            0,
          );
        },
      },
      ...navigationItems.map((item, index) => ({
        id: item.id,
        label: `Открыть: ${item.label}`,
        hint: item.id === activeTab ? 'Текущая вкладка' : 'Перейти к разделу',
        icon: item.icon,
        shortcut: `Ctrl+${index + 1}`,
        run: () => onNavigate(item.id),
      })),
      {
        id: 'toggle-sidebar',
        label: 'Переключить боковую панель',
        hint: 'Свернуть или развернуть навигацию',
        icon: 'sidebar',
        shortcut: 'Ctrl+B',
        run: onToggleSidebar,
      },
      {
        id: 'new-galaxy-item',
        label: 'Создать объект Галактики',
        hint: 'Открыть редактор в текущем разделе библиотеки',
        icon: 'galaxies',
        shortcut: 'Ctrl+Shift+G',
        run: () => {
          onNavigate('galaxies');
          window.setTimeout(
            () => window.dispatchEvent(new Event('galactrix:new-galaxy-item')),
            0,
          );
        },
      },
      {
        id: 'new-provider',
        label: 'Добавить подключение',
        hint: 'Открыть выбор провайдера в Телескопе',
        icon: 'telescope',
        shortcut: 'Ctrl+Shift+P',
        run: () => {
          onNavigate('telescope');
          window.setTimeout(
            () => window.dispatchEvent(new Event('galactrix:new-provider')),
            0,
          );
        },
      },
      {
        id: 'toggle-maximize',
        label: 'Развернуть или восстановить окно',
        hint: 'Изменить режим главного окна',
        icon: 'maximize',
        run: () => void appWindow.toggleMaximize(),
      },
      {
        id: 'minimize-window',
        label: 'Свернуть окно',
        hint: 'Оставить Galactrix в панели задач',
        icon: 'minimize',
        run: () => void appWindow.minimize(),
      },
    ],
    [activeTab, appWindow, onNavigate, onToggleSidebar],
  );

  useEffect(() => {
    if (isMobile) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        commands[0]?.run();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        onToggleSidebar();
      }
      if ((event.ctrlKey || event.metaKey) && /^[1-5]$/.test(event.key)) {
        event.preventDefault();
        const item = navigationItems[Number(event.key) - 1];
        if (item) onNavigate(item.id);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        onNavigate('settings');
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'g'
      ) {
        event.preventDefault();
        commands.find((command) => command.id === 'new-galaxy-item')?.run();
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'p'
      ) {
        event.preventDefault();
        commands.find((command) => command.id === 'new-provider')?.run();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commands, isMobile, onNavigate, onToggleSidebar]);

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
  const filteredCommands = normalized
    ? commands.filter((command) =>
        `${command.label} ${command.hint}`.toLowerCase().includes(normalized),
      )
    : commands;
  const filteredChats = normalized
    ? chats
        .filter((chat) =>
          `${chat.title} ${chat.preview}`.toLowerCase().includes(normalized),
        )
        .slice(0, 5)
    : [];

  const run = (command: Command) => {
    command.run();
    setQuery('');
    setFocused(false);
  };

  const toggleMaximize = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (
      target.closest(
        'button, input, [role="button"], [role="listbox"], [role="searchbox"]',
      )
    ) {
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
      className="relative z-50 grid h-12 shrink-0 grid-cols-[9rem_minmax(0,1fr)_9rem] items-center border-b border-separator bg-background app-drag-region"
      onDoubleClick={toggleMaximize}
    >
      <div
        data-tauri-drag-region
        className="flex min-w-0 items-center gap-2 pl-3 pr-2"
      >
        <BrandMark size={24} />
        <span className="hidden truncate text-xs font-semibold min-[760px]:block">
          Galactrix
        </span>
      </div>

      <div className="min-w-0 px-2 sm:px-4" data-command-search="true">
        <div
          className="relative mx-auto w-full max-w-2xl"
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={() => window.setTimeout(() => setFocused(false), 120)}
        >
          <SearchField
            fullWidth
            variant="secondary"
            value={query}
            onChange={setQuery}
            onSubmit={() => {
              if (filteredCommands[0]) run(filteredCommands[0]);
              else if (filteredChats[0]) {
                onOpenChat(filteredChats[0].id);
                setQuery('');
                setFocused(false);
              }
            }}
          >
            <SearchField.Group className="h-8 w-full">
              <SearchField.SearchIcon />
              <SearchField.Input
                ref={searchInputRef}
                placeholder="Команда или поиск по чатам"
                aria-label="Поиск и команды"
                autoComplete="off"
                className="min-w-0"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setQuery('');
                    setFocused(false);
                    event.currentTarget.blur();
                  }
                }}
              />
              <Kbd
                variant="light"
                className="mr-1 hidden shrink-0 min-[760px]:inline-flex"
              >
                <Kbd.Abbr keyValue="ctrl" title="Control">
                  Ctrl
                </Kbd.Abbr>
                <Kbd.Content>K</Kbd.Content>
              </Kbd>
              <SearchField.ClearButton aria-label="Очистить поиск" />
            </SearchField.Group>
          </SearchField>

          {focused ? (
            <Surface
              className="ui-overlay-surface scrollbar-thin absolute inset-x-0 top-[calc(100%+0.4rem)] max-h-[min(70vh,34rem)] overflow-y-auto p-1"
              variant="transparent"
            >
              <p className="px-3 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                Команды
              </p>
              {filteredCommands.slice(0, 9).map((command) => (
                <Button
                  key={command.id}
                  fullWidth
                  variant="ghost"
                  className="h-auto justify-start gap-3 px-3 py-2 text-left hover:bg-default-hover rounded-lg"
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
                  {command.shortcut ? (
                    <span className="ml-auto shrink-0 text-xs text-muted">
                      {command.shortcut}
                    </span>
                  ) : null}
                </Button>
              ))}
              {normalized && filteredChats.length > 0 ? (
                <>
                  <div className="mx-2 my-1 h-px bg-separator" />
                  <p className="px-3 pb-1 pt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                    Чаты
                  </p>
                  {filteredChats.map((chat) => (
                    <Button
                      key={chat.id}
                      fullWidth
                      variant="ghost"
                      className="h-auto justify-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-default-hover"
                      onPress={() => {
                        onOpenChat(chat.id);
                        setQuery('');
                        setFocused(false);
                      }}
                    >
                      <Icon name="chats" className="size-4 shrink-0" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {chat.title}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {chat.preview || 'Открыть чат'}
                        </span>
                      </span>
                    </Button>
                  ))}
                </>
              ) : null}
              {filteredCommands.length === 0 && filteredChats.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted">
                  Команды не найдены
                </p>
              ) : null}
            </Surface>
          ) : null}
        </div>
      </div>

      <div className="flex h-full w-36 items-stretch justify-self-end">
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
