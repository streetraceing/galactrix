import { Button, Input, Label, ListBox, Select, TextArea } from '@heroui/react';
import type { ChangeEvent } from 'react';
import { UiModal } from '../../../components/ui/UiModal';
import type { GalaxyItem, GalaxyKind } from '../../../types';
import { galaxyFilters } from '../catalog';

export function GalaxyEditorModal({
  isOpen,
  editing,
  kind,
  name,
  description,
  saving,
  error,
  onOpenChange,
  onKindChange,
  onNameChange,
  onDescriptionChange,
  onSave,
  onDelete,
}: {
  isOpen: boolean;
  editing: GalaxyItem | null;
  kind: GalaxyKind;
  name: string;
  description: string;
  saving: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onKindChange: (kind: GalaxyKind) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <UiModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={editing ? 'Редактирование' : 'Новый объект'}
      description="Данные хранятся локально и будут доступны при настройке чатов."
      footer={
        <>
          {editing ? (
            <Button variant="danger" isPending={saving} onPress={onDelete}>
              Удалить
            </Button>
          ) : null}
          <span className="flex-1" />
          <Button
            variant="secondary"
            isDisabled={saving}
            onPress={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            variant="primary"
            isPending={saving}
            isDisabled={!name.trim()}
            onPress={onSave}
          >
            Сохранить
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="filter">Тип</Label>
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label="Фильтр галактик"
              value={kind}
              onChange={(value) => {
                if (value !== null) {
                  onKindChange(value as GalaxyKind);
                }
              }}
              placeholder="Выберите тип"
              className="w-full"
              id="filter"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>

              <Select.Popover>
                <ListBox>
                  {galaxyFilters.slice(1).map((entry) => (
                    <ListBox.Item
                      key={entry.id}
                      id={entry.id}
                      textValue={entry.label}
                    >
                      {entry.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="name">Название</Label>
          <Input
            fullWidth
            variant="secondary"
            value={name}
            id="name"
            placeholder="Персона, вселенная..."
            aria-label="Название"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onNameChange(event.target.value)
            }
          />
        </div>

        <TextArea
          fullWidth
          variant="secondary"
          rows={7}
          value={description}
          placeholder="Описание, инструкции или содержимое"
          aria-label="Описание"
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            onDescriptionChange(event.target.value)
          }
        />
        {error ? (
          <p className="selectable text-sm text-danger">{error}</p>
        ) : null}
      </div>
    </UiModal>
  );
}
