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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('galaxies');
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
      toast.success(t('galaxiesScreen.galaxiesExportIsReady'), {
        description: t('count.object', { count: selectedItems.length }),
      });
    } catch (caught) {
      toast.danger(t('galaxiesScreen.couldNotExportGalaxies'), {
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
      toast.success(t('galaxiesScreen.galaxiesImportComplete'), {
        description: t('galaxiesScreen.importCount', {
          value1: importedCount,
        }),
      });
    } catch (caught) {
      toast.danger(t('galaxiesScreen.couldNotImportGalaxies'), {
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
      name: t('galaxiesScreen.copyName', { value1: item.name }),
    });
    setError('');
    setModalOpen(true);
  };

  const save = async (nextDraft: GalaxyItemInput) => {
    if (!nextDraft.name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...nextDraft,
        name: nextDraft.name.trim(),
        description: nextDraft.description.trim(),
      });
      setModalOpen(false);
      toast.success(
        editing
          ? t('galaxiesScreen.objectUpdated')
          : t('galaxiesScreen.objectAdded'),
        {
          description: nextDraft.name.trim(),
        },
      );
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
      toast.success(t('galaxiesScreen.objectDeleted'), {
        description: removedName,
      });
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
          title={t('galaxiesScreen.galaxies')}
          description={t(
            'galaxiesScreen.personasCharactersUniversesWorldbooksStylesAndPromptSets',
          )}
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
                <Icon name="download" className="size-4" />{' '}
                {t('galaxiesScreen.export')}
              </Button>
              <Button
                variant="secondary"
                className="flex-1 sm:flex-none"
                isPending={importing}
                onPress={() => void importItems()}
              >
                <Icon name="upload" className="size-4" />{' '}
                {t('galaxiesScreen.import')}
              </Button>
              <Button
                variant="primary"
                className="flex lg:hidden"
                onPress={() => openCreate(section)}
                isIconOnly
              >
                <Icon name="plus" className="size-4" />{' '}
              </Button>
              <Button
                variant="primary"
                className="w-full sm:w-auto hidden lg:flex"
                onPress={() => openCreate(section)}
              >
                <Icon name="plus" className="size-4" />{' '}
                <span>
                  {t('galaxiesScreen.create')} {galaxyKindCreateLabels[section]}
                </span>
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
              aria-label={t('galaxiesScreen.galaxySections')}
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
                    {t('count.libraryObject', {
                      count: sectionItems.length,
                    })}
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
                    title={t('galaxiesScreen.theValue1SectionIsEmpty', {
                      value1: entry.label,
                    })}
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
        initialDraft={draft}
        styles={styles}
        promptSets={promptSets}
        saving={saving}
        error={error}
        onOpenChange={(open) => !saving && setModalOpen(open)}
        onSave={(nextDraft) => void save(nextDraft)}
      />

      <UiModal
        isOpen={exportOpen}
        onOpenChange={(open) => !exporting && setExportOpen(open)}
        onConfirm={() => void exportItems()}
        isConfirmDisabled={exportIds.length === 0 || exporting}
        title={t('galaxiesScreen.exportGalaxies')}
        description={t(
          'galaxiesScreen.selectOnlyTheObjectsYouNeedAndWhereToSave',
        )}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={exporting}
              onPress={() => setExportOpen(false)}
            >
              {t('galaxyEditorModal.cancel')}
            </Button>
            <Button
              variant="primary"
              autoFocus
              isPending={exporting}
              isDisabled={exportIds.length === 0}
              onPress={() => void exportItems()}
            >
              {t('galaxiesScreen.export2')}
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
            {t(
              'galaxiesScreen.linkedStylesAndSetsAreAddedAutomaticallyForSelectedCharacters',
            )}
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
        onConfirm={() => void remove()}
        isConfirmDisabled={!deleteTarget || saving}
        title={t('galaxiesScreen.deleteObject')}
        description={
          deleteTarget
            ? t('galaxiesScreen.deleteObjectDescription', {
                value1: deleteTarget.name,
              })
            : undefined
        }
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={saving}
              onPress={() => setDeleteTarget(null)}
            >
              {t('galaxyEditorModal.cancel')}
            </Button>
            <Button
              variant="danger"
              autoFocus
              isPending={saving}
              onPress={() => void remove()}
            >
              {t('galaxyCard.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {t('galaxiesScreen.thisActionCannotBeUndone')}
        </p>
        {error ? (
          <p className="selectable mt-2 text-sm text-danger">{error}</p>
        ) : null}
      </UiModal>
    </div>
  );
}
