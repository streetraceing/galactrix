import { Button, Input, Label, TextArea } from '@heroui/react';
import { useEffect, useState } from 'react';
import { UiModal } from '../../../components/ui/UiModal';
import { PromptPreviewCard } from '../../../components/ui/PromptPreviewCard';
import { isMobilePlatform } from '../../../lib/platform';
import type {
  CharacterData,
  Chat,
  ChatConfigInput,
  GalaxyItem,
  Message,
  PromptContextPriorities,
  Provider,
} from '../../../types';
import { clonePromptConfig, defaultPromptConfig } from '../promptConfig';
import { promptPreviewFromChat } from '../promptPreview';
import { ChatContextPicker } from './ChatContextPicker';
import { ChatProviderPicker } from './ChatProviderPicker';
import { PromptBuilder } from './PromptBuilder';
import { useTranslation } from 'react-i18next';
import { i18next } from '../../../i18n';

function newChatConfig(): ChatConfigInput {
  return {
    title: i18next.t('setup.defaultTitle', { ns: 'chats' }),
    greetingMessage: '',
    worldbookIds: [],
    promptConfig: clonePromptConfig(defaultPromptConfig),
  };
}

function configFromChat(chat: Chat): ChatConfigInput {
  return {
    title: chat.title,
    providerId: chat.providerId,
    personaId: chat.personaId,
    characterId: chat.characterId,
    universeId: chat.universeId,
    worldbookIds: [...chat.worldbookIds],
    promptConfig: clonePromptConfig(chat.promptConfig),
  };
}

export function ChatSetupModal({
  isOpen,
  chat,
  galaxyItems,
  providers,
  profileName,
  responseLanguage,
  messages = [],
  saving,
  onOpenChange,
  onSubmit,
}: {
  isOpen: boolean;
  chat: Chat | null;
  galaxyItems: GalaxyItem[];
  providers: Provider[];
  profileName?: string;
  responseLanguage?: 'en' | 'ru';
  messages?: Message[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ChatConfigInput) => void;
}) {
  const autoFocus = !isMobilePlatform();
  const { t } = useTranslation('chats');
  const [form, setForm] = useState<ChatConfigInput>(newChatConfig);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      chat
        ? configFromChat(chat)
        : {
            ...newChatConfig(),
            promptConfig: clonePromptConfig(defaultPromptConfig),
          },
    );
  }, [chat, isOpen]);

  const promptIsValid = form.promptConfig.customBlocks.every(
    (block) =>
      !block.enabled || Boolean(block.title.trim() && block.content.trim()),
  );
  const canSubmit = Boolean(form.title.trim()) && promptIsValid && !saving;
  const submit = () => {
    if (!canSubmit) return;
    const greetingMessage = form.greetingMessage?.trim();
    onSubmit({
      ...form,
      title: form.title.trim(),
      greetingMessage: chat ? undefined : greetingMessage || undefined,
    });
  };
  const activePromptSources: Array<keyof PromptContextPriorities> = [
    ...(form.personaId ? (['persona'] as const) : []),
    ...(form.characterId ? (['character'] as const) : []),
    ...(form.universeId ? (['universe'] as const) : []),
    ...(form.worldbookIds.length ? (['worldbooks'] as const) : []),
    ...(messages.some((message) => message.remembered)
      ? (['remembered'] as const)
      : []),
    ...(form.promptConfig.presetIds.length ? (['presets'] as const) : []),
  ];

  return (
    <UiModal
      isOpen={isOpen}
      onOpenChange={(open) => !saving && onOpenChange(open)}
      onConfirm={submit}
      isConfirmDisabled={!canSubmit}
      size="cover"
      title={
        chat ? t('chatSetupModal.chatSettings') : t('chatSetupModal.newChat')
      }
      description={t(
        'chatSetupModal.youCanChangeTheProviderRoleplayContextAndResponseStyle',
      )}
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            isDisabled={saving}
            onPress={() => onOpenChange(false)}
          >
            {t('chatDialogs.cancel')}
          </Button>
          <Button
            variant="primary"
            isPending={saving}
            isDisabled={!canSubmit}
            onPress={submit}
          >
            {chat ? t('chatDialogs.save') : t('chatSetupModal.createChat')}
          </Button>
        </div>
      }
    >
      <div className="min-w-0 space-y-5">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="chat-title">{t('chatSetupModal.name')}</Label>
            <Input
              id="chat-title"
              fullWidth
              variant="secondary"
              value={form.title}
              maxLength={120}
              autoFocus={autoFocus}
              autoComplete="off"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="min-h-10 flex items-center"
            />
          </div>
          <ChatProviderPicker
            providers={providers}
            value={form.providerId}
            onChange={(providerId) =>
              setForm((current) => ({ ...current, providerId }))
            }
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="chat-recent-message-limit">
            {t('chatSetupModal.recentMessageLimit')}
          </Label>
          <Input
            id="chat-recent-message-limit"
            fullWidth
            variant="secondary"
            type="number"
            min={0}
            max={500}
            step={1}
            value={String(form.promptConfig.recentMessageLimit ?? 50)}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              const recentMessageLimit = Number.isFinite(parsed)
                ? Math.min(500, Math.max(0, parsed))
                : 0;
              setForm((current) => ({
                ...current,
                promptConfig: {
                  ...current.promptConfig,
                  recentMessageLimit,
                },
              }));
            }}
          />
          <p className="text-xs leading-5 text-muted">
            {t('chatSetupModal.recentMessageLimitDescription')}
          </p>
        </div>

        <ChatContextPicker
          galaxyItems={galaxyItems}
          value={form}
          onChange={setForm}
        />

        {!chat ? (
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="chat-greeting">
              {t('chatSetupModal.greetingMessage')}
            </Label>
            <TextArea
              id="chat-greeting"
              fullWidth
              variant="secondary"
              value={form.greetingMessage ?? ''}
              maxLength={12_000}
              rows={4}
              autoComplete="off"
              placeholder={t('chatSetupModal.greetingMessagePlaceholder')}
              aria-label={t('chatSetupModal.greetingMessage')}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  greetingMessage: event.target.value,
                }))
              }
            />
            <p className="text-xs leading-5 text-muted">
              {t('chatSetupModal.greetingMessageDescription')}
            </p>
          </div>
        ) : null}

        <PromptBuilder
          value={form.promptConfig}
          sets={galaxyItems.filter((item) => item.kind === 'prompt-set')}
          inheritedSetIds={
            (
              galaxyItems.find((item) => item.id === form.characterId)?.data as
                CharacterData | undefined
            )?.promptSetIds ?? []
          }
          activeContextFields={activePromptSources}
          onChange={(promptConfig) =>
            setForm((current) => ({ ...current, promptConfig }))
          }
        />
        <PromptPreviewCard
          input={promptPreviewFromChat(
            form,
            galaxyItems,
            profileName,
            messages,
            responseLanguage,
          )}
          title={t('chatSetupModal.chatPromptEstimate')}
        />
      </div>
    </UiModal>
  );
}
