import { Button, Chip, Tabs, toast } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { UiModal } from '../../components/ui/UiModal';
import type { GalaxyItem, GalaxyItemInput, GalaxyKind } from '../../types';
import { GalaxyCard } from './components/GalaxyCard';
import { GalaxyEditorModal } from './components/GalaxyEditorModal';
import {
  galaxyKindDescriptions,
  galaxyKindLabels,
  galaxySections,
} from './catalog';
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
  const [section, setSection] = useState<GalaxyKind>('persona');
  const [editing, setEditing] = useState<GalaxyItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalaxyItem | null>(null);
  const [draft, setDraft] = useState<GalaxyItemInput>(createGalaxyDraft());
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const byKind = useMemo(
    () =>
      Object.fromEntries(
        galaxySections.map(({ id }) => [
          id,
          items.filter((item) => item.kind === id),
        ]),
      ) as Record<GalaxyKind, GalaxyItem[]>,
    [items],
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
      name: `${item.name} - копия`,
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
      toast.success(editing ? 'Объект обновлён' : 'Объект добавлен', {
        description: draft.name.trim(),
      });
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
      const removedName = deleteTarget.name;
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
      if (editing?.id === deleteTarget.id) setModalOpen(false);
      toast.success('Объект удалён', { description: removedName });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-scroll mobile-screen-enter flex-1">
      <div className="page-container">
        <PageHeader
          title="Галактики"
          description="Персоны, персонажи, вселенные, ворлдбуки и стили переписки."
          actions={
            <Button
              variant="primary"
              onPress={() => openCreate(section)}
              fullWidth
            >
              <Icon name="plus" className="size-4" /> Создать{' '}
              {galaxyKindLabels[section].toLocaleLowerCase('ru-RU')}
            </Button>
          }
        />

        <Tabs
          selectedKey={section}
          onSelectionChange={(key) => setSection(String(key) as GalaxyKind)}
          className="w-full"
        >
          <Tabs.ListContainer className="w-full">
            <Tabs.List
              aria-label="Разделы Галактики"
              className="w-max min-w-full *:min-w-max *:flex-1 *:gap-2"
            >
              {galaxySections.map((entry) => (
                <Tabs.Tab key={entry.id} id={entry.id}>
                  {entry.label}
                  <Chip size="sm" variant="soft" className="bg-transparent">
                    {byKind[entry.id].length}
                  </Chip>
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>

          {galaxySections.map((entry) => {
            const sectionItems = byKind[entry.id];
            return (
              <Tabs.Panel key={entry.id} id={entry.id} className="pt-5 sm:pt-6">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="section-title">{entry.label}</h2>
                    <p className="section-description max-w-3xl">
                      {galaxyKindDescriptions[entry.id]}
                    </p>
                  </div>
                  <span className="text-xs text-muted">
                    {sectionItems.length.toLocaleString('ru-RU')} в библиотеке
                  </span>
                </div>

                {sectionItems.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {sectionItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="mobile-card-enter"
                        style={{ animationDelay: `${index * 45}ms` }}
                      >
                        <GalaxyCard
                          item={item}
                          onEdit={() => openEdit(item)}
                          onDuplicate={() => duplicate(item)}
                          onDelete={() => setDeleteTarget(item)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="galaxies"
                    title={`Раздел «${entry.label}» пуст`}
                    description={galaxyKindDescriptions[entry.id]}
                    compact
                  />
                )}
              </Tabs.Panel>
            );
          })}
        </Tabs>
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
