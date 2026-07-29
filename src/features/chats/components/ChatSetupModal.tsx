import { Button, Input, Label } from '@heroui/react';
import { useEffect, useState } from 'react';
import { UiModal } from '../../../components/ui/UiModal';
import type {
  Chat,
  ChatConfigInput,
  GalaxyItem,
  Provider,
} from '../../../types';
import { clonePromptConfig, defaultPromptConfig } from '../promptConfig';
import { ChatContextPicker } from './ChatContextPicker';
import { ChatProviderPicker } from './ChatProviderPicker';
import { PromptBuilder } from './PromptBuilder';

const newChatConfig: ChatConfigInput = {
  title: 'Новый чат',
  worldbookIds: [],
  promptConfig: clonePromptConfig(defaultPromptConfig),
};

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
  saving,
  error,
  onOpenChange,
  onSubmit,
}: {
  isOpen: boolean;
  chat: Chat | null;
  galaxyItems: GalaxyItem[];
  providers: Provider[];
  saving: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ChatConfigInput) => void;
}) {
  const [form, setForm] = useState<ChatConfigInput>(newChatConfig);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      chat
        ? configFromChat(chat)
        : {
            ...newChatConfig,
            promptConfig: clonePromptConfig(defaultPromptConfig),
          },
    );
  }, [chat, isOpen]);

  const promptIsValid = form.promptConfig.customBlocks.every(
    (block) =>
      !block.enabled || Boolean(block.title.trim() && block.content.trim()),
  );

  return (
    <UiModal
      isOpen={isOpen}
      onOpenChange={(open) => !saving && onOpenChange(open)}
      size="cover"
      title={chat ? 'Настройки чата' : 'Новый чат'}
      description="Провайдер, ролевой контекст и стиль ответа можно изменить в любое время."
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            isDisabled={saving}
            onPress={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            variant="primary"
            isPending={saving}
            isDisabled={!form.title.trim() || !promptIsValid}
            onPress={() => onSubmit({ ...form, title: form.title.trim() })}
          >
            {chat ? 'Сохранить' : 'Создать чат'}
          </Button>
        </div>
      }
    >
      <div className="min-w-0 space-y-5">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="chat-title">Название</Label>
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
          onChange={(promptConfig) =>
            setForm((current) => ({ ...current, promptConfig }))
          }
        />

        {error ? (
          <p className="selectable text-sm text-danger">{error}</p>
        ) : null}
      </div>
    </UiModal>
  );
}
