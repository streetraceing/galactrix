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
    <div className="app-page-scroll scrollbar-thin">
      <div className="app-page-container">
        <header className="app-page-header">
          <div>
            <h1 className="app-page-title">Галактики</h1>
            <p className="app-page-description">
              Библиотека персон, персонажей, вселенных и ворлдбуков.
            </p>
          </div>
          <Button variant="primary" onPress={openCreate}>
            <Icon name="plus" className="size-4" /> Создать
          </Button>
        </header>

        <Surface
          variant="secondary"
          className="app-panel app-filter-toolbar mt-5"
        >
          <div className="app-filter-scroll">
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
                  className="shrink-0"
                  onPress={() => setFilter(entry.id)}
                >
                  {entry.label}
                  <Chip size="sm" variant="soft">
                    {count}
                  </Chip>
                </Button>
              );
            })}
          </div>
        </Surface>

        {filtered.length > 0 ? (
          <div className="app-library-grid mt-4">
            {filtered.map((item) => (
              <Surface
                key={item.id}
                variant="secondary"
                className="app-panel app-library-card"
              >
                <Button
                  variant="ghost"
                  className="app-card-action h-full w-full items-stretch justify-start text-left"
                  onPress={() => openEdit(item)}
                >
                  <span className="app-accent-tile app-library-icon">
                    <Icon name={kindIcons[item.kind]} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <strong className="min-w-0 flex-1 truncate text-base font-semibold">
                        {item.name}
                      </strong>
                      <Chip size="sm" variant="soft">
                        {kindLabels[item.kind]}
                      </Chip>
                    </span>
                    <span className="app-muted mt-2 line-clamp-3 block text-sm leading-6">
                      {item.description || 'Описание пока не добавлено.'}
                    </span>
                    <span className="app-card-footer app-muted">
                      <span>Изменено {item.updatedAt}</span>
                      <Icon name="chevron" className="size-4" />
                    </span>
                  </span>
                </Button>
              </Surface>
            ))}
          </div>
        ) : (
          <Surface
            variant="secondary"
            className="app-panel app-empty-panel mt-5"
          >
            <span className="app-empty-icon">
              <Icon name="galaxies" className="size-6" />
            </span>
            <div>
              <h2>
                {filter === 'all'
                  ? 'Библиотека пока пуста'
                  : 'В этой категории пока ничего нет'}
              </h2>
              <p>Создайте первый объект и заполните его реальными данными.</p>
            </div>
            <Button variant="primary" onPress={openCreate}>
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
