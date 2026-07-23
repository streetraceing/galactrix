import { Button } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import type { GalaxyItem, GalaxyItemInput, GalaxyKind } from '../../types';
import { GalaxyCard } from './components/GalaxyCard';
import { GalaxyEditorModal } from './components/GalaxyEditorModal';
import { GalaxyFilterBar } from './components/GalaxyFilterBar';

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
    <div className="page-scroll">
      <div className="page-container">
        <PageHeader
          title="Галактики"
          description="Персоны, персонажи, вселенные и ворлдбуки."
          actions={
            <Button variant="primary" onPress={openCreate}>
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
                onPress={() => openEdit(item)}
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
                ? 'Создайте первую персону, персонажа, вселенную или ворлдбук.'
                : 'В выбранной категории пока нет объектов.'
            }
            action={
              items.length === 0
                ? {
                    label: 'Создать объект',
                    onPress: openCreate,
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
        kind={kind}
        name={name}
        description={description}
        saving={saving}
        error={error}
        onOpenChange={(open) => !saving && setModalOpen(open)}
        onKindChange={setKind}
        onNameChange={setName}
        onDescriptionChange={setDescription}
        onSave={() => void save()}
        onDelete={() => void remove()}
      />
    </div>
  );
}
