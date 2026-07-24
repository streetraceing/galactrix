import { Button, Input, Label } from '@heroui/react';
import { useEffect, useState } from 'react';
import { UiModal } from '../../../components/ui/UiModal';
import type {
  Chat,
  ChatConfigInput,
  GalaxyItem,
  Provider,
} from '../../../types';
import { ChatContextPicker } from './ChatContextPicker';
import { ChatProviderPicker } from './ChatProviderPicker';

const newChatConfig: ChatConfigInput = {
  title: 'Новый чат',
  worldbookIds: [],
};

function configFromChat(chat: Chat): ChatConfigInput {
  return {
    title: chat.title,
    providerId: chat.providerId,
    personaId: chat.personaId,
    characterId: chat.characterId,
    universeId: chat.universeId,
    worldbookIds: [...chat.worldbookIds],
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
    setForm(chat ? configFromChat(chat) : { ...newChatConfig });
  }, [chat, isOpen]);

  return (
    <UiModal
      isOpen={isOpen}
      onOpenChange={(open) => !saving && onOpenChange(open)}
      size="lg"
      title={chat ? 'Настройки чата' : 'Новый чат'}
      description="Провайдер и ролевой контекст можно изменить в любое время через контекстное меню чата."
      footer={
        <>
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
            isDisabled={!form.title.trim()}
            onPress={() => onSubmit({ ...form, title: form.title.trim() })}
          >
            {chat ? 'Сохранить' : 'Создать чат'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="chat-title">Название</Label>
            <Input
              id="chat-title"
              fullWidth
              variant="secondary"
              value={form.title}
              maxLength={120}
              autoFocus
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

        {error ? (
          <p className="selectable text-sm text-danger">{error}</p>
        ) : null}
      </div>
    </UiModal>
  );
}
