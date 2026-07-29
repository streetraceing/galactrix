import { Button, Chip, Tabs } from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../i18n/toast';
import {
  ExportDestinationPicker,
  ExportSelectionList,
} from '../../components/ui/ExportOptions';
import { PageHeader } from '../../components/ui/PageHeader';
import { UiModal } from '../../components/ui/UiModal';
import {
  datedJsonName,
  defaultExportDestination,
  exportJsonFile,
  importJsonFile,
  type ExportDestination,
} from '../../lib/jsonTransfer';
import { countRu } from '../../lib/plural';
import type {
  CharacterData,
  GalaxyItem,
  GalaxyItemInput,
  GalaxyKind,
} from '../../types';
import { GalaxyCard } from './components/GalaxyCard';
import { GalaxyEditorModal } from './components/GalaxyEditorModal';
import {
  galaxyKindCreateLabels,
  galaxyKindDescriptions,
  galaxyKindLabels,
  galaxySections,
} from './catalog';
import { createGalaxyDraft, draftFromItem } from './model';
import { createGalaxiesExport, parseGalaxiesExport } from './transfer';

export function GalaxiesScreen({
  items,
  onSave,
  onImport,
  onDelete,
}: {
  items: GalaxyItem[];
  onSave: (item: GalaxyItemInput) => Promise<void>;
  onImport: (items: GalaxyItemInput[]) => Promise<number>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [section, setSection] = useState<GalaxyKind>('persona');
  const [editing, setEditing] = useState<GalaxyItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalaxyItem | null>(null);
  const [draft, setDraft] = useState<GalaxyItemInput>(createGalaxyDraft());
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportIds, setExportIds] = useState<string[]>([]);
  const [exportDestination, setExportDestination] = useState<ExportDestination>(
    defaultExportDestination,
  );
  const [importing, setImporting] = useState(false);
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
  const promptSets = useMemo(
    () => items.filter((item) => item.kind === 'prompt-set'),
    [items],
  );
  const includeExportDependencies = (ids: string[]) => {
    const selected = new Set(ids);
    for (const item of items) {
      if (item.kind !== 'character' || !selected.has(item.id)) continue;
      const data = item.data as CharacterData;
      if (data.styleItemId) selected.add(data.styleItemId);
      for (const setId of data.promptSetIds ?? []) selected.add(setId);
    }
    return items.filter((item) => selected.has(item.id)).map((item) => item.id);
  };

  const exportItems = async () => {
    if (exporting || exportIds.length === 0) return;
    const selectedItems = items.filter((item) => exportIds.includes(item.id));
    setExporting(true);
    try {
      const exported = await exportJsonFile(
        datedJsonName('galactrix-galaxies'),
        createGalaxiesExport(selectedItems),
        exportDestination,
      );
      if (!exported) return;
      setExportOpen(false);
      toast.success('Экспорт Галактик готов', {
        description: countRu(selectedItems.length, [
          'объект',
          'объекта',
          'объектов',
        ]),
      });
    } catch (caught) {
      toast.danger('Не удалось экспортировать Галактики', {
        description: caught instanceof Error ? caught.message : String(caught),
      });
    } finally {
      setExporting(false);
    }
  };

  const importItems = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const raw = await importJsonFile();
      if (raw == null) return;
      const imported = parseGalaxiesExport(raw);
      const importedCount = await onImport(imported);
      toast.success('Импорт Галактик завершён', {
        description: `Добавлено или обновлено: ${importedCount}`,
      });
    } catch (caught) {
      toast.danger('Не удалось импортировать Галактики', {
        description: caught instanceof Error ? caught.message : String(caught),
      });
    } finally {
      setImporting(false);
    }
  };

  const openCreate = (kind: GalaxyKind = 'persona') => {
    setEditing(null);
    setDraft(createGalaxyDraft(kind));
    setError('');
    setModalOpen(true);
  };

  useEffect(() => {
    const createCurrentItem = () => openCreate(section);
    window.addEventListener('galactrix:new-galaxy-item', createCurrentItem);
    return () =>
      window.removeEventListener(
        'galactrix:new-galaxy-item',
        createCurrentItem,
      );
  }, [section]);

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
          description="Персоны, персонажи, вселенные, ворлдбуки, стили и наборы промптов."
          actions={
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button
                variant="secondary"
                className="flex-1 sm:flex-none"
                isDisabled={items.length === 0}
                onPress={() => {
                  setExportIds(items.map((item) => item.id));
                  setExportDestination(defaultExportDestination());
                  setExportOpen(true);
                }}
              >
                <Icon name="download" className="size-4" /> Экспорт
              </Button>
              <Button
                variant="secondary"
                className="flex-1 sm:flex-none"
                isPending={importing}
                onPress={() => void importItems()}
              >
                <Icon name="upload" className="size-4" /> Импорт
              </Button>
              <Button
                variant="primary"
                className="w-full sm:w-auto"
                onPress={() => openCreate(section)}
              >
                <Icon name="plus" className="size-4" /> Создать{' '}
                {galaxyKindCreateLabels[section]}
              </Button>
            </div>
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
                    {countRu(sectionItems.length, [
                      'объект в библиотеке',
                      'объекта в библиотеке',
                      'объектов в библиотеке',
                    ])}
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
        promptSets={promptSets}
        saving={saving}
        error={error}
        onOpenChange={(open) => !saving && setModalOpen(open)}
        onDraftChange={setDraft}
        onSave={() => void save()}
      />

      <UiModal
        isOpen={exportOpen}
        onOpenChange={(open) => !exporting && setExportOpen(open)}
        title="Экспорт Галактики"
        description="Выберите только нужные объекты и место, куда сохранить JSON."
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={exporting}
              onPress={() => setExportOpen(false)}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              isPending={exporting}
              isDisabled={exportIds.length === 0}
              onPress={() => void exportItems()}
            >
              Экспортировать
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <ExportSelectionList
            items={items.map((item) => ({
              id: item.id,
              title: item.name,
              description: galaxyKindLabels[item.kind],
            }))}
            selectedIds={exportIds}
            onChange={(ids) => setExportIds(includeExportDependencies(ids))}
          />
          <p className="-mt-3 text-xs leading-5 text-muted">
            Для выбранных персонажей связанные стили и наборы добавляются
            автоматически, чтобы импорт не потерял настройки.
          </p>
          <ExportDestinationPicker
            value={exportDestination}
            onChange={setExportDestination}
          />
        </div>
      </UiModal>

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
