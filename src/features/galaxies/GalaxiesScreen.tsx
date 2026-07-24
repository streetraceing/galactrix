import { Button } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { UiModal } from '../../components/ui/UiModal';
import type { GalaxyItem, GalaxyItemInput, GalaxyKind } from '../../types';
import { GalaxyCard } from './components/GalaxyCard';
import { GalaxyEditorModal } from './components/GalaxyEditorModal';
import { GalaxyFilterBar } from './components/GalaxyFilterBar';
import { createGalaxyDraft, draftFromItem } from './model';

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
  const [deleteTarget, setDeleteTarget] = useState<GalaxyItem | null>(null);
  const [draft, setDraft] = useState<GalaxyItemInput>(createGalaxyDraft());
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(
    () =>
      filter === 'all' ? items : items.filter((item) => item.kind === filter),
    [filter, items],
  );
  const styles = useMemo(
    () => items.filter((item) => item.kind === 'style'),
    [items],
  );

  const openCreate = (kind: GalaxyKind = 'persona') => {
    setEditing(null);
    setDraft(createGalaxyDraft(kind));
    setError('');
    setModalOpen(true);
  };

  const openEdit = (item: GalaxyItem) => {
    setEditing(item);
    setDraft(draftFromItem(item));
    setError('');
    setModalOpen(true);
  };

  const duplicate = (item: GalaxyItem) => {
    const copy = draftFromItem(item);
    setEditing(null);
    setDraft({
      ...copy,
      id: undefined,
      name: `${item.name} — копия`,
    });
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...draft,
        name: draft.name.trim(),
        description: draft.description.trim(),
      });
      setModalOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget || saving) return;
    setSaving(true);
    setError('');
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
      if (editing?.id === deleteTarget.id) setModalOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <PageHeader
          title="Галактики"
          description="Персоны, персонажи, вселенные, ворлдбуки и стили переписки."
          actions={
            <Button variant="primary" onPress={() => openCreate()} fullWidth>
              <Icon name="plus" className="size-4" /> Создать
            </Button>
          }
        />

        <GalaxyFilterBar items={items} value={filter} onChange={setFilter} />

        {filtered.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <GalaxyCard
                key={item.id}
                item={item}
                onEdit={() => openEdit(item)}
                onDuplicate={() => duplicate(item)}
                onDelete={() => setDeleteTarget(item)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="galaxies"
            title={
              items.length === 0 ? 'Библиотека пуста' : 'Ничего не найдено'
            }
            description={
              items.length === 0
                ? 'Создайте контекст, который можно будет подключать к чатам.'
                : 'В выбранной категории пока нет объектов.'
            }
            action={
              items.length === 0
                ? {
                    label: 'Создать объект',
                    onPress: () => openCreate(),
                    icon: <Icon name="plus" className="size-4" />,
                  }
                : undefined
            }
            compact
          />
        )}
      </div>

      <GalaxyEditorModal
        isOpen={modalOpen}
        editing={editing}
        draft={draft}
        styles={styles}
        saving={saving}
        error={error}
        onOpenChange={(open) => !saving && setModalOpen(open)}
        onDraftChange={setDraft}
        onSave={() => void save()}
      />

      <UiModal
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && !saving && setDeleteTarget(null)}
        title="Удалить объект?"
        description={
          deleteTarget
            ? `«${deleteTarget.name}» будет удалён из библиотеки и отвязан от чатов.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={saving}
              onPress={() => setDeleteTarget(null)}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              isPending={saving}
              onPress={() => void remove()}
            >
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">Это действие нельзя отменить.</p>
        {error ? (
          <p className="selectable mt-2 text-sm text-danger">{error}</p>
        ) : null}
      </UiModal>
    </div>
  );
}
