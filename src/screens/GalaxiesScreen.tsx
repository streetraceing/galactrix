import { Button, Chip, Input, Surface, TextArea } from '@heroui/react';
import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Icon } from '../components/Icon';
import { UiModal } from '../components/UiModal';
import type { GalaxyItem, GalaxyItemInput, GalaxyKind } from '../types';

const filters: Array<{ id: 'all' | GalaxyKind; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'persona', label: 'Персоны' },
  { id: 'character', label: 'Персонажи' },
  { id: 'universe', label: 'Вселенные' },
  { id: 'worldbook', label: 'Ворлдбуки' },
];

const kindLabels: Record<GalaxyKind, string> = {
  persona: 'Персона',
  character: 'Персонаж',
  universe: 'Вселенная',
  worldbook: 'Ворлдбук',
};

const kindIcons: Record<GalaxyKind, 'user' | 'brain' | 'planet' | 'book'> = {
  persona: 'user',
  character: 'brain',
  universe: 'planet',
  worldbook: 'book',
};

export function GalaxiesScreen({
  items,
  onSave,
  onDelete,
}: {
  items: GalaxyItem[];
  onSave: (item: GalaxyItemInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<'all' | GalaxyKind>('all');
  const [editing, setEditing] = useState<GalaxyItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [kind, setKind] = useState<GalaxyKind>('persona');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(
    () =>
      filter === 'all' ? items : items.filter((item) => item.kind === filter),
    [filter, items],
  );

  const openCreate = () => {
    setEditing(null);
    setKind('persona');
    setName('');
    setDescription('');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (item: GalaxyItem) => {
    setEditing(item);
    setKind(item.kind);
    setName(item.name);
    setDescription(item.description);
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave({
        id: editing?.id,
        kind,
        name: name.trim(),
        description: description.trim(),
      });
      setModalOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing || saving) return;
    setSaving(true);
    setError('');
    try {
      await onDelete(editing.id);
      setModalOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Галактики</h1>
            <p className="mt-1 text-sm leading-6 app-muted">
              Персоны, персонажи, вселенные и ворлдбуки.
            </p>
          </div>
          <Button variant="primary" onPress={openCreate}>
            <Icon name="plus" className="size-4" /> Создать
          </Button>
        </header>

        <Surface
          variant="secondary"
          className="mt-6 flex flex-wrap gap-1 p-1.5"
        >
          {filters.map((entry) => {
            const count =
              entry.id === 'all'
                ? items.length
                : items.filter((item) => item.kind === entry.id).length;
            return (
              <Button
                key={entry.id}
                size="sm"
                variant={filter === entry.id ? 'secondary' : 'ghost'}
                onPress={() => setFilter(entry.id)}
              >
                {entry.label}
                <Chip size="sm" variant="soft">
                  {count}
                </Chip>
              </Button>
            );
          })}
        </Surface>

        {filtered.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <Surface key={item.id} variant="secondary" className="p-1">
                <Button
                  variant="ghost"
                  className="h-full w-full items-start justify-start gap-3 px-3 py-4 text-left"
                  onPress={() => openEdit(item)}
                >
                  <span className="app-accent-tile grid size-10 shrink-0 place-items-center rounded-xl">
                    <Icon name={kindIcons[item.kind]} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-xs app-muted">
                      {kindLabels[item.kind]}
                    </span>
                    <strong className="mt-0.5 block truncate font-medium">
                      {item.name}
                    </strong>
                    <span className="mt-2 line-clamp-3 block text-sm leading-6 app-muted">
                      {item.description || 'Без описания'}
                    </span>
                    <span className="mt-3 block text-xs app-muted">
                      {item.updatedAt}
                    </span>
                  </span>
                  <Icon
                    name="chevron"
                    className="mt-1 size-4 shrink-0 app-muted"
                  />
                </Button>
              </Surface>
            ))}
          </div>
        ) : (
          <Surface variant="secondary" className="mt-8 p-8 text-center">
            <h2 className="text-lg font-semibold">
              {filter === 'all'
                ? 'Галактика пуста'
                : 'В категории пока ничего нет'}
            </h2>
            <p className="mt-2 text-sm app-muted">Создайте первый объект.</p>
            <Button className="mt-5" variant="primary" onPress={openCreate}>
              <Icon name="plus" className="size-4" /> Создать объект
            </Button>
          </Surface>
        )}
      </div>

      <UiModal
        isOpen={modalOpen}
        onOpenChange={(open) => !saving && setModalOpen(open)}
        title={editing ? 'Редактирование' : 'Новый объект'}
        description={
          editing
            ? kindLabels[editing.kind]
            : 'Выберите тип и заполните данные.'
        }
        footer={
          <>
            {editing && (
              <Button
                variant="danger"
                isPending={saving}
                onPress={() => void remove()}
              >
                Удалить
              </Button>
            )}
            <span className="flex-1" />
            <Button
              variant="ghost"
              isDisabled={saving}
              onPress={() => setModalOpen(false)}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              isPending={saving}
              isDisabled={!name.trim()}
              onPress={() => void save()}
            >
              Сохранить
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(kindLabels) as GalaxyKind[]).map((value) => (
            <Button
              key={value}
              variant={kind === value ? 'secondary' : 'ghost'}
              className="h-auto flex-col gap-2 py-3"
              onPress={() => setKind(value)}
            >
              <Icon name={kindIcons[value]} className="size-5" />
              <span className="text-xs">{kindLabels[value]}</span>
            </Button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="galaxy-name"
            >
              Название
            </label>
            <Input
              id="galaxy-name"
              fullWidth
              variant="secondary"
              value={name}
              autoFocus
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setName(event.target.value)
              }
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="galaxy-description"
            >
              Описание
            </label>
            <TextArea
              id="galaxy-description"
              fullWidth
              variant="secondary"
              rows={6}
              value={description}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(event.target.value)
              }
              className="resize-y"
            />
          </div>
        </div>
        {error && (
          <p className="allow-selection mt-3 text-sm app-danger">{error}</p>
        )}
      </UiModal>
    </div>
  );
}
