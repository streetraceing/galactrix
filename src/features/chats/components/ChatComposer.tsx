import { Button, Dropdown, Label, TextArea } from '@heroui/react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Icon } from '../../../components/Icon';
import { AppPanel } from '../../../components/ui/AppPanel';
import { TooltipIconButton } from '../../../components/ui/TooltipIconButton';
import { UiModal } from '../../../components/ui/UiModal';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../../components/ui/context-menu';
import { backendErrorHasVariable } from '../../../lib/backend';
import { isMobilePlatform } from '../../../lib/platform';
import {
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from '../../../lib/storage';
import type { Provider } from '../../../types';
import { copyChatText } from '../chatClipboard';
import { useTranslation } from 'react-i18next';
import {
  insertBoldText,
  insertDialogueQuote,
  insertOocAside,
  insertRoleplayAction,
  type ComposerInsertion,
} from '../composerTools';
import { draftKey } from '../utils';

function readDraft(chatId: string, saveDrafts: boolean) {
  return saveDrafts ? (readStorageItem(draftKey(chatId)) ?? '') : '';
}

function persistDraft(chatId: string, value: string) {
  if (value) writeStorageItem(draftKey(chatId), value);
  else removeStorageItem(draftKey(chatId));
}

type ComposerToolAction =
  'roleplay' | 'bold' | 'quote' | 'ooc' | 'fullscreen' | 'copy' | 'clear';

function ChatComposerComponent({
  chatId,
  provider,
  sending,
  sendOnEnter,
  focusAfterSend,
  focusAfterActionRequest,
  saveDrafts,
  shouldAutoFocus,
  focusKey,
  wide,
  onSend,
  onCancel,
  onHeightChange,
}: {
  chatId: string;
  provider?: Provider;
  sending: boolean;
  sendOnEnter: boolean;
  focusAfterSend: boolean;
  focusAfterActionRequest: number;
  saveDrafts: boolean;
  shouldAutoFocus: boolean;
  focusKey: string;
  wide: boolean;
  onSend: (value: string) => Promise<void>;
  onCancel: () => Promise<void>;
  onHeightChange?: (delta: number) => void;
}) {
  const { t } = useTranslation('chats');
  const isMobile = isMobilePlatform();
  const [draft, setDraft] = useState(() => readDraft(chatId, saveDrafts));
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fullscreenTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);
  const submittingRef = useRef(false);
  const pendingFocusAfterSendRef = useRef(false);
  const previousFocusAfterActionRequestRef = useRef(focusAfterActionRequest);
  const suppressSendUntilRef = useRef(0);
  const providerId = provider?.id;

  const focusComposer = useCallback(() => {
    const textArea = textAreaRef.current;
    if (!textArea || textArea.disabled) return false;
    if (document.activeElement === textArea) return true;
    textArea.focus({ preventScroll: true });
    textArea.setSelectionRange(textArea.value.length, textArea.value.length);
    return true;
  }, []);

  const setDraftValue = useCallback((value: string) => {
    draftRef.current = value;
    setDraft(value);
  }, []);

  const applyInsertion = useCallback(
    (
      insert: (
        value: string,
        selectionStart: number,
        selectionEnd: number,
      ) => ComposerInsertion,
      target?: HTMLTextAreaElement | null,
    ) => {
      const textArea = target ?? textAreaRef.current;
      const start = textArea?.selectionStart ?? draftRef.current.length;
      const end = textArea?.selectionEnd ?? start;
      const insertion = insert(draftRef.current, start, end);
      setDraftValue(insertion.value);
      window.requestAnimationFrame(() => {
        const nextTarget =
          fullscreenOpen && fullscreenTextAreaRef.current
            ? fullscreenTextAreaRef.current
            : textAreaRef.current;
        if (!nextTarget || nextTarget.disabled) return;
        nextTarget.focus({ preventScroll: true });
        nextTarget.setSelectionRange(
          insertion.selectionStart,
          insertion.selectionEnd,
        );
      });
    },
    [fullscreenOpen, setDraftValue],
  );

  const openFullscreen = useCallback(() => {
    setMobileMenuOpen(false);
    setFullscreenOpen(true);
  }, []);

  const runToolAction = useCallback(
    (action: ComposerToolAction, target?: HTMLTextAreaElement | null) => {
      setMobileMenuOpen(false);
      switch (action) {
        case 'roleplay':
          applyInsertion(insertRoleplayAction, target);
          break;
        case 'bold':
          applyInsertion(insertBoldText, target);
          break;
        case 'quote':
          applyInsertion(insertDialogueQuote, target);
          break;
        case 'ooc':
          applyInsertion(insertOocAside, target);
          break;
        case 'fullscreen':
          openFullscreen();
          break;
        case 'copy':
          if (draftRef.current) void copyChatText(draftRef.current);
          break;
        case 'clear':
          setDraftValue('');
          break;
      }
    },
    [applyInsertion, openFullscreen, setDraftValue],
  );

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    setDraft(readDraft(chatId, saveDrafts));
  }, [chatId, saveDrafts]);

  useEffect(() => {
    if (!saveDrafts) {
      removeStorageItem(draftKey(chatId));
      return;
    }

    const timer = window.setTimeout(
      () => persistDraft(chatId, draftRef.current),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [chatId, draft, saveDrafts]);

  useEffect(
    () => () => {
      if (saveDrafts) persistDraft(chatId, draftRef.current);
    },
    [chatId, saveDrafts],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;

    let previousHeight = root.getBoundingClientRect().height;
    const observer = new ResizeObserver(([entry]) => {
      const nextHeight =
        entry?.contentRect.height ?? root.getBoundingClientRect().height;
      const delta = nextHeight - previousHeight;
      previousHeight = nextHeight;
      if (Math.abs(delta) > 0.5) onHeightChange?.(delta);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [onHeightChange]);

  useLayoutEffect(() => {
    const textArea = textAreaRef.current;
    if (!textArea) return;

    textArea.style.height = 'auto';
    textArea.style.height = `${Math.min(textArea.scrollHeight, 192)}px`;
  }, [draft]);

  useEffect(() => {
    if (!fullscreenOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const textArea = fullscreenTextAreaRef.current;
      if (!textArea || textArea.disabled) return;
      textArea.focus({ preventScroll: true });
      const position = textArea.value.length;
      textArea.setSelectionRange(position, position);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fullscreenOpen]);

  useEffect(() => {
    if (!shouldAutoFocus || !providerId) return;

    const frame = window.requestAnimationFrame(() => {
      focusComposer();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusComposer, focusKey, providerId, shouldAutoFocus]);

  useEffect(() => {
    if (!focusAfterSend) {
      pendingFocusAfterSendRef.current = false;
      return;
    }
    if (sending || !pendingFocusAfterSendRef.current || !providerId) return;

    const frame = window.requestAnimationFrame(() => {
      if (focusComposer()) pendingFocusAfterSendRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusAfterSend, focusComposer, providerId, sending]);

  useEffect(() => {
    if (
      previousFocusAfterActionRequestRef.current === focusAfterActionRequest
    ) {
      return;
    }
    previousFocusAfterActionRequestRef.current = focusAfterActionRequest;
    pendingFocusAfterSendRef.current = focusAfterSend;
    if (!focusAfterSend || sending || !providerId) return;

    const frame = window.requestAnimationFrame(() => {
      if (focusComposer()) pendingFocusAfterSendRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    focusAfterActionRequest,
    focusAfterSend,
    focusComposer,
    providerId,
    sending,
  ]);

  useEffect(() => {
    if (!shouldAutoFocus || !providerId) return;

    const focusComposerForTyping = (event: globalThis.KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.key.length !== 1
      ) {
        return;
      }

      const usesAltGraph = event.getModifierState('AltGraph');
      if (event.metaKey || (!usesAltGraph && (event.ctrlKey || event.altKey))) {
        return;
      }

      if (document.querySelector('[aria-modal="true"], [role="dialog"]')) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      if (
        event.key === ' ' &&
        target instanceof Element &&
        target.closest('button, a, [role="button"]')
      ) {
        return;
      }

      const textArea = textAreaRef.current;
      if (!textArea || textArea.disabled) return;

      event.preventDefault();
      const nextDraft = `${draftRef.current}${event.key}`;
      draftRef.current = nextDraft;
      setDraft(nextDraft);
      textArea.focus({ preventScroll: true });
      window.requestAnimationFrame(() => {
        const currentTextArea = textAreaRef.current;
        if (!currentTextArea) return;
        currentTextArea.setSelectionRange(
          currentTextArea.value.length,
          currentTextArea.value.length,
        );
      });
    };

    window.addEventListener('keydown', focusComposerForTyping, true);
    return () =>
      window.removeEventListener('keydown', focusComposerForTyping, true);
  }, [providerId, shouldAutoFocus]);

  const submit = async () => {
    const value = draft.trim();
    if (!value || !provider || sending || submittingRef.current) return;

    submittingRef.current = true;
    pendingFocusAfterSendRef.current = focusAfterSend;
    draftRef.current = '';
    setDraft('');
    try {
      await onSend(value);
      setFullscreenOpen(false);
      setMobileMenuOpen(false);
      if (draftRef.current) persistDraft(chatId, draftRef.current);
      else removeStorageItem(draftKey(chatId));
    } catch (error) {
      if (!backendErrorHasVariable(error, 'messagePersisted', 'true')) {
        setDraft((current) => {
          const restored = current || value;
          draftRef.current = restored;
          return restored;
        });
      }
    } finally {
      submittingRef.current = false;
      if (focusAfterSend) {
        window.requestAnimationFrame(() => {
          if (focusComposer()) pendingFocusAfterSendRef.current = false;
        });
      }
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const sendWithShortcut =
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.altKey &&
      !event.getModifierState('AltGraph') &&
      !event.nativeEvent.isComposing &&
      (sendOnEnter || event.ctrlKey || event.metaKey);
    if (!sendWithShortcut) return;
    event.preventDefault();
    void submit();
  };

  const desktopToolsButton = !isMobile ? (
    <Dropdown>
      <Button
        isIconOnly
        size="lg"
        variant="tertiary"
        className="size-12 min-w-12 shrink-0 p-0"
        aria-label={t('chatComposer.tools')}
      >
        <Icon name="magic-wand" className="size-5" />
      </Button>
      <Dropdown.Popover
        placement="top end"
        className="min-w-64 max-w-[min(20rem,calc(100vw-2rem))]"
      >
        <Dropdown.Menu
          aria-label={t('chatComposer.toolsDescription')}
          onAction={(key) =>
            runToolAction(
              String(key) as ComposerToolAction,
              textAreaRef.current,
            )
          }
        >
          <Dropdown.Item
            id="roleplay"
            textValue={t('chatComposer.insertRoleplayAction')}
          >
            <Icon name="sparkles" className="size-4 text-accent" />
            <Label>{t('chatComposer.insertRoleplayAction')}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="bold" textValue={t('chatComposer.insertBold')}>
            <Icon name="edit" className="size-4" />
            <Label>{t('chatComposer.insertBold')}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="quote" textValue={t('chatComposer.insertQuote')}>
            <Icon name="message_box" className="size-4" />
            <Label>{t('chatComposer.insertQuote')}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="ooc" textValue={t('chatComposer.insertOoc')}>
            <Icon name="info" className="size-4" />
            <Label>{t('chatComposer.insertOoc')}</Label>
          </Dropdown.Item>
          <Dropdown.Item
            id="fullscreen"
            textValue={t('chatComposer.openFullscreen')}
          >
            <Icon name="screen-full" className="size-4" />
            <Label>{t('chatComposer.openFullscreen')}</Label>
          </Dropdown.Item>
          {draft ? (
            <Dropdown.Item id="copy" textValue={t('chatComposer.copyDraft')}>
              <Icon name="copy" className="size-4" />
              <Label>{t('chatComposer.copyDraft')}</Label>
            </Dropdown.Item>
          ) : null}
          {draft ? (
            <Dropdown.Item id="clear" textValue={t('chatComposer.clearDraft')}>
              <Icon name="clear" className="size-4" />
              <Label>{t('chatComposer.clearDraft')}</Label>
            </Dropdown.Item>
          ) : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  ) : null;

  const sendButton = isMobile ? (
    <ContextMenu
      open={mobileMenuOpen}
      onOpenChange={(open) => {
        setMobileMenuOpen(open);
        if (open) suppressSendUntilRef.current = Date.now() + 900;
      }}
    >
      <ContextMenuTrigger className="flex size-12 items-center justify-center">
        <Button
          isIconOnly
          size="lg"
          variant="primary"
          className={`size-12 min-w-12 p-0 ${draft.trim() ? '' : 'opacity-55'}`}
          aria-label={t('chatComposer.sendMessage')}
          aria-disabled={!draft.trim() || !provider}
          isDisabled={!provider}
          onPress={() => {
            if (mobileMenuOpen || Date.now() < suppressSendUntilRef.current) {
              return;
            }
            void submit();
          }}
        >
          <Icon name="send" className="size-5" />
        </Button>
      </ContextMenuTrigger>
      <ContextMenuContent
        side="top"
        align="end"
        className="w-[min(17rem,calc(100dvw-1rem))]"
      >
        <ContextMenuLabel>{t('chatComposer.tools')}</ContextMenuLabel>
        <ContextMenuItem
          onClick={() => runToolAction('roleplay', textAreaRef.current)}
        >
          <Icon name="sparkles" className="size-4 text-accent" />
          {t('chatComposer.insertRoleplayAction')}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => runToolAction('bold', textAreaRef.current)}
        >
          <Icon name="edit" className="size-4" />
          {t('chatComposer.insertBold')}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => runToolAction('quote', textAreaRef.current)}
        >
          <Icon name="message_box" className="size-4" />
          {t('chatComposer.insertQuote')}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => runToolAction('ooc', textAreaRef.current)}
        >
          <Icon name="info" className="size-4" />
          {t('chatComposer.insertOoc')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => runToolAction('fullscreen')}>
          <Icon name="screen-full" className="size-4" />
          {t('chatComposer.openFullscreen')}
        </ContextMenuItem>
        {draft ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => runToolAction('copy')}>
              <Icon name="copy" className="size-4" />
              {t('chatComposer.copyDraft')}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => runToolAction('clear')}>
              <Icon name="clear" className="size-4" />
              {t('chatComposer.clearDraft')}
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  ) : (
    <TooltipIconButton
      label={t('chatComposer.sendMessage')}
      size="lg"
      variant="primary"
      className="size-12 min-w-12 p-0"
      tooltipTriggerClassName="flex size-12 items-center justify-center leading-none"
      isDisabled={!draft.trim() || !provider}
      onPress={() => void submit()}
    >
      <Icon name="send" className="size-5" />
    </TooltipIconButton>
  );

  return (
    <>
      <div ref={rootRef} className="chat-composer">
        <div className={`mx-auto w-full ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
          <AppPanel className="chat-composer__panel p-2">
            <div className="flex min-w-0 items-end gap-2">
              <TextArea
                autoComplete="off"
                ref={textAreaRef}
                fullWidth
                variant="secondary"
                rows={1}
                value={draft}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setDraftValue(event.target.value)
                }
                onKeyDown={handleComposerKeyDown}
                enterKeyHint={sendOnEnter ? 'send' : 'enter'}
                placeholder={t('chatComposer.placeholder')}
                aria-label={t('chatComposer.label')}
                disabled={!provider}
                className="scrollbar-thin min-h-12 max-h-48 min-w-0 flex-1 resize-none overflow-y-auto transition-none ring-0"
              />

              {desktopToolsButton}

              <div className="flex size-12 shrink-0 self-end items-center justify-center">
                {sending ? (
                  <TooltipIconButton
                    label={t('chatComposer.cancelGeneration')}
                    size="lg"
                    variant="tertiary"
                    className="size-12 min-w-12 p-0 text-danger"
                    tooltipTriggerClassName="flex size-12 items-center justify-center leading-none"
                    onPress={() => void onCancel()}
                  >
                    <Icon name="close" className="size-5" />
                  </TooltipIconButton>
                ) : (
                  sendButton
                )}
              </div>
            </div>
            <div className="hidden flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-2 text-[0.7rem] text-muted sm:flex">
              <span>
                {provider
                  ? `${provider.model} · max ${provider.maxTokens}`
                  : t('chatComposer.usesConnectionSettings')}
              </span>
              <span>
                {sendOnEnter
                  ? t('chatComposer.enterSend')
                  : t('chatComposer.ctrlEnterSend')}
              </span>
            </div>
          </AppPanel>
        </div>
      </div>

      <UiModal
        isOpen={fullscreenOpen}
        onOpenChange={setFullscreenOpen}
        title={t('chatComposer.fullscreenTitle')}
        description={t('chatComposer.fullscreenDescription')}
        size="full"
        onConfirm={() => void submit()}
        isConfirmDisabled={!draft.trim() || !provider || sending}
        bodyClassName="flex min-h-0 flex-col"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="tertiary" onPress={() => setFullscreenOpen(false)}>
              {t('chatComposer.closeFullscreen')}
            </Button>
            <Button
              variant="primary"
              isDisabled={!draft.trim() || !provider || sending}
              onPress={() => void submit()}
            >
              <Icon name="send" className="size-4" />
              {t('chatComposer.send')}
            </Button>
          </div>
        }
      >
        <div className="flex min-h-full min-w-0 flex-1 flex-col gap-3">
          <div className="scrollbar-thin flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto rounded-xl border border-separator bg-default/30 p-1.5 [&>button]:shrink-0">
            <Button
              size="sm"
              variant="tertiary"
              isDisabled={!provider || sending}
              onPress={() =>
                runToolAction('roleplay', fullscreenTextAreaRef.current)
              }
            >
              <Icon name="sparkles" className="size-4 text-accent" />
              <span className="hidden sm:inline">
                {t('chatComposer.insertRoleplayAction')}
              </span>
            </Button>
            <Button
              size="sm"
              variant="tertiary"
              isDisabled={!provider || sending}
              onPress={() =>
                runToolAction('bold', fullscreenTextAreaRef.current)
              }
            >
              <Icon name="edit" className="size-4" />
              <span className="hidden sm:inline">
                {t('chatComposer.insertBold')}
              </span>
            </Button>
            <Button
              size="sm"
              variant="tertiary"
              isDisabled={!provider || sending}
              onPress={() =>
                runToolAction('quote', fullscreenTextAreaRef.current)
              }
            >
              <Icon name="message_box" className="size-4" />
              <span className="hidden sm:inline">
                {t('chatComposer.insertQuote')}
              </span>
            </Button>
            <Button
              size="sm"
              variant="tertiary"
              isDisabled={!provider || sending}
              onPress={() =>
                runToolAction('ooc', fullscreenTextAreaRef.current)
              }
            >
              <Icon name="info" className="size-4" />
              <span className="hidden sm:inline">
                {t('chatComposer.insertOoc')}
              </span>
            </Button>
            {draft ? (
              <>
                <span
                  className="hidden h-6 w-px bg-separator sm:block"
                  aria-hidden
                />
                <Button
                  size="sm"
                  variant="tertiary"
                  onPress={() => runToolAction('copy')}
                >
                  <Icon name="copy" className="size-4" />
                  <span className="hidden sm:inline">
                    {t('chatComposer.copyDraft')}
                  </span>
                </Button>
                <Button
                  size="sm"
                  variant="tertiary"
                  className="text-danger"
                  onPress={() => runToolAction('clear')}
                >
                  <Icon name="clear" className="size-4" />
                  <span className="hidden sm:inline">
                    {t('chatComposer.clearDraft')}
                  </span>
                </Button>
              </>
            ) : null}
          </div>
          <TextArea
            autoComplete="off"
            ref={fullscreenTextAreaRef}
            fullWidth
            variant="secondary"
            rows={6}
            value={draft}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setDraftValue(event.target.value)
            }
            onKeyDown={handleComposerKeyDown}
            placeholder={t('chatComposer.fullscreenPlaceholder')}
            aria-label={t('chatComposer.label')}
            disabled={!provider}
            className="scrollbar-thin min-h-36 max-h-[58dvh] resize-none overflow-y-auto sm:min-h-48"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>{t('chatComposer.fullscreenHint')}</span>
            <span className="tabular-nums">
              {t('chatComposer.characters', { count: draft.length })}
            </span>
          </div>
        </div>
      </UiModal>
    </>
  );
}

export const ChatComposer = memo(ChatComposerComponent);
