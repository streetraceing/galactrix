import { Button, Input, Label, ListBox, Select } from '@heroui/react';
import { useEffect, useState } from 'react';
import { UiModal } from '../../../components/ui/UiModal';
import type {
  Chat,
  ChatConfigInput,
  GalaxyItem,
  Provider,
  ResponsePreset,
} from '../../../types';
import { ChatContextPicker } from './ChatContextPicker';
import { ChatProviderPicker } from './ChatProviderPicker';

const responsePresets: Array<{
  id: ResponsePreset;
  label: string;
  description: string;
}> = [
  {
    id: 'natural',
    label: 'Естественный',
    description:
      'Следует персонажу и контексту без дополнительных ограничений.',
  },
  {
    id: 'human',
    label: 'Максимально человечный',
    description:
      'Живой ритм, конкретные формулировки и минимум ассистентского тона.',
  },
  {
    id: 'dialogue-only',
    label: 'Только реплики',
    description:
      'Без действий, сценических ремарок, звёздочек и повествования.',
  },
  {
    id: 'no-emoji',
    label: 'Без эмодзи',
    description: 'Эмодзи и декоративные символы удаляются из ответа.',
  },
  {
    id: 'first-person',
    label: 'От первого лица',
    description:
      'Персонаж пишет от своего имени и не описывает себя в третьем лице.',
  },
  {
    id: 'clean-human',
    label: 'Чистый живой диалог',
    description:
      'Человечный стиль, первое лицо, без эмодзи и ролевых действий.',
  },
];

const newChatConfig: ChatConfigInput = {
  title: 'Новый чат',
  worldbookIds: [],
  responsePreset: 'natural',
};

function configFromChat(chat: Chat): ChatConfigInput {
  return {
    title: chat.title,
    providerId: chat.providerId,
    personaId: chat.personaId,
    characterId: chat.characterId,
    universeId: chat.universeId,
    worldbookIds: [...chat.worldbookIds],
    responsePreset: chat.responsePreset,
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
  onCloneWithMessages?: (input: ChatConfigInput) => void;
}) {
  const [form, setForm] = useState<ChatConfigInput>(newChatConfig);

  useEffect(() => {
    if (!isOpen) return;
    setForm(chat ? configFromChat(chat) : { ...newChatConfig });
  }, [chat, isOpen]);

  const preset =
    responsePresets.find((entry) => entry.id === form.responsePreset) ??
    responsePresets[0];

  return (
    <UiModal
      isOpen={isOpen}
      onOpenChange={(open) => !saving && onOpenChange(open)}
      size="lg"
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
            isDisabled={!form.title.trim()}
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

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label>Пресет ответа</Label>
          <Select
            aria-label="Пресет ответа модели"
            value={form.responsePreset}
            variant="secondary"
            onChange={(value) => {
              if (typeof value === 'string') {
                setForm((current) => ({
                  ...current,
                  responsePreset: value as ResponsePreset,
                }));
              }
            }}
          >
            <Select.Trigger className="w-full">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {responsePresets.map((entry) => (
                  <ListBox.Item
                    key={entry.id}
                    id={entry.id}
                    textValue={entry.label}
                  >
                    <div className="min-w-0 py-0.5">
                      <div className="truncate font-medium">{entry.label}</div>
                      <div className="line-clamp-2 text-xs text-muted">
                        {entry.description}
                      </div>
                    </div>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <p className="text-xs leading-5 text-muted">{preset.description}</p>
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
