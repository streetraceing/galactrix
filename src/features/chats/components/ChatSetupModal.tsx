import { Button, Input, Label } from '@heroui/react';
import { useEffect, useState } from 'react';
import { UiModal } from '../../../components/ui/UiModal';
import { PromptPreviewCard } from '../../../components/ui/PromptPreviewCard';
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
  rememberedMessages = [],
  saving,
  error,
  onOpenChange,
  onSubmit,
}: {
  isOpen: boolean;
  chat: Chat | null;
  galaxyItems: GalaxyItem[];
  providers: Provider[];
  profileName?: string;
  rememberedMessages?: Message[];
  saving: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ChatConfigInput) => void;
}) {
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
  const activePromptSources: Array<keyof PromptContextPriorities> = [
    ...(form.personaId ? (['persona'] as const) : []),
    ...(form.characterId ? (['character'] as const) : []),
    ...(form.universeId ? (['universe'] as const) : []),
    ...(form.worldbookIds.length ? (['worldbooks'] as const) : []),
    ...(rememberedMessages.length ? (['remembered'] as const) : []),
    ...(form.promptConfig.presetIds.length ? (['presets'] as const) : []),
  ];

  return (
    <UiModal
      isOpen={isOpen}
      onOpenChange={(open) => !saving && onOpenChange(open)}
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
            isDisabled={!form.title.trim() || !promptIsValid}
            onPress={() => onSubmit({ ...form, title: form.title.trim() })}
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
              autoFocus
              autoComplete="off"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
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

        <ChatContextPicker
          galaxyItems={galaxyItems}
          value={form}
          onChange={setForm}
        />

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
            rememberedMessages,
          )}
          title={t('chatSetupModal.chatPromptEstimate')}
        />

        {error ? (
          <p className="selectable text-sm text-danger">{error}</p>
        ) : null}
      </div>
    </UiModal>
  );
}
