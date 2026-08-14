import {
  Button,
  Chip,
  Dropdown,
  Label,
  SearchField,
  Tabs,
} from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { ContextSelectionToolbar } from '../../components/ui/ContextSelectionToolbar';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../i18n/toast';
import { errorMessage } from '../../lib/errors';
import { MOTION_STAGGER_MS } from '../../lib/motion';
import {
  consumeGalaxyQuickCreate,
  subscribeGalaxyQuickCreate,
} from '../../lib/galaxyQuickCreate';
import {
  ExportDestinationPicker,
  ExportSelectionList,
} from '../../components/ui/ExportOptions';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppTabList } from '../../components/ui/AppTabList';
import { UiModal } from '../../components/ui/UiModal';
import { useContextSelection } from '../../hooks/useContextSelection';
import { useSwipeableTabs } from '../../hooks/useSwipeableTabs';
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
  galaxyKindCreateLabelKeys,
  galaxyKindDescriptionKeys,
  galaxyKindIcons,
  galaxyKindLabelKeys,
  galaxySections,
} from './catalog';
import { createGalaxyDraft, draftFromItem } from './model';
import { createGalaxiesExport, parseGalaxiesExport } from './transfer';
import { useTranslation } from 'react-i18next';

const galaxySectionKeys = galaxySections.map(({ id }) => id);

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
  const { t } = useTranslation(['galaxies', 'common']);
  const [section, setSection] = useState<GalaxyKind>('persona');
  const [query, setQuery] = useState('');
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
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const selection = useContextSelection(itemIds);
  const swipeRef = useSwipeableTabs({
    keys: galaxySectionKeys,
    selectedKey: section,
    onSelectionChange: setSection,
  });

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
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleByKind = useMemo(
    () =>
      Object.fromEntries(
        galaxySections.map(({ id }) => [
          id,
          byKind[id].filter((item) =>
            `${item.name} ${item.description}`
              .toLocaleLowerCase()
              .includes(normalizedQuery),
          ),
        ]),
      ) as Record<GalaxyKind, GalaxyItem[]>,
    [byKind, normalizedQuery],
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
        description: errorMessage(caught),
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
        description: errorMessage(caught),
      });
    } finally {
      setImporting(false);
    }
  };

  const openCreate = (kind: GalaxyKind = 'persona') => {
    selection.clear();
    setSection(kind);
    setEditing(null);
    setDraft(createGalaxyDraft(kind));
    setError('');
    setModalOpen(true);
  };

  useEffect(() => {
    const createRequestedItem = () => {
      const request = consumeGalaxyQuickCreate();
      if (request == null) return;
      openCreate(request === 'current' ? section : request);
    };
    createRequestedItem();
    return subscribeGalaxyQuickCreate(createRequestedItem);
  }, [section]);

  const openEdit = (item: GalaxyItem) => {
    selection.clear();
    setEditing(item);
    setDraft(draftFromItem(item));
    setError('');
    setModalOpen(true);
  };

  const duplicate = (item: GalaxyItem) => {
    selection.clear();
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
      setError(errorMessage(caught));
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
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const exportSelected = () => {
    const ids = includeExportDependencies([...selection.selectedIds]);
    if (ids.length === 0) return;
    setExportIds(ids);
    setExportDestination(defaultExportDestination());
    setExportOpen(true);
  };

  const removeSelected = async () => {
    if (selection.selectedIds.size === 0 || saving) return;
    const ids = [...selection.selectedIds];
    setSaving(true);
    setError('');
    try {
      for (const id of ids) await onDelete(id);
      selection.clear();
      setBulkDeleteOpen(false);
      toast.success(t('selection.deletedCount', { count: ids.length }));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={swipeRef} className="page-scroll app-screen-enter flex-1">
      <div className="page-container">
        <PageHeader
          title={t('galaxiesScreen.galaxies')}
          description={t(
            'galaxiesScreen.personasCharactersUniversesWorldbooksStylesAndPromptSets',
          )}
          actions={
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button
                variant="tertiary"
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
                variant="tertiary"
                className="flex-1 sm:flex-none"
                isPending={importing}
                onPress={() => void importItems()}
              >
                <Icon name="upload" className="size-4" />{' '}
                {t('galaxiesScreen.import')}
              </Button>
              <Dropdown className="flex-1 sm:flex-none">
                <Button
                  variant="primary"
                  className="w-full sm:w-auto"
                  aria-label={t('galaxiesScreen.quickCreateDescription')}
                >
                  <Icon name="plus" className="size-4" />
                  <span>{t('galaxiesScreen.quickCreate')}</span>
                  <Icon name="chevron" className="size-3.5" />
                </Button>
                <Dropdown.Popover placement="bottom end" className="min-w-56">
                  <Dropdown.Menu
                    aria-label={t('galaxiesScreen.quickCreateDescription')}
                    onAction={(key) => openCreate(String(key) as GalaxyKind)}
                  >
                    {galaxySections.map((entry) => (
                      <Dropdown.Item
                        key={entry.id}
                        id={entry.id}
                        textValue={`${t('galaxiesScreen.create')} ${t(galaxyKindCreateLabelKeys[entry.id])}`}
                      >
                        <Icon
                          name={galaxyKindIcons[entry.id]}
                          className="size-4"
                        />
                        <Label>{t(entry.labelKey)}</Label>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>
          }
        />

        <SearchField
          fullWidth
          variant="secondary"
          value={query}
          onChange={setQuery}
          className="mb-3 sm:mb-4"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              autoComplete="off"
              placeholder={t('galaxiesScreen.search')}
              aria-label={t('galaxiesScreen.search')}
            />
            <SearchField.ClearButton
              aria-label={t('galaxiesScreen.clearSearch')}
            />
          </SearchField.Group>
        </SearchField>

        <ContextSelectionToolbar
          count={selection.selectedIds.size}
          total={items.length}
          selectedLabel={t('selection.selectedCount', {
            count: selection.selectedIds.size,
          })}
          clearLabel={t('selection.clear')}
          selectAllLabel={t('selection.selectAll')}
          onClear={selection.clear}
          onSelectAll={selection.selectAll}
          className="mb-3 sm:mb-4"
          actions={[
            {
              key: 'export',
              label: t('selection.export'),
              icon: 'download',
              onPress: exportSelected,
            },
            {
              key: 'delete',
              label: t('selection.delete'),
              icon: 'trash',
              danger: true,
              onPress: () => {
                setError('');
                setBulkDeleteOpen(true);
              },
            },
          ]}
        />

        <Tabs
          selectedKey={section}
          onSelectionChange={(key) => setSection(String(key) as GalaxyKind)}
          className="w-full"
        >
          <AppTabList
            label={t('galaxiesScreen.galaxySections')}
            items={galaxySections.map((entry) => ({
              id: entry.id,
              label: t(entry.labelKey),
              accessory: (
                <Chip size="sm" variant="soft" className="bg-transparent">
                  {normalizedQuery
                    ? visibleByKind[entry.id].length
                    : byKind[entry.id].length}
                </Chip>
              ),
            }))}
          />

          {galaxySections.map((entry) => {
            const sectionItems = visibleByKind[entry.id];
            return (
              <Tabs.Panel key={entry.id} id={entry.id} className="pt-5 sm:pt-6">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="section-title">{t(entry.labelKey)}</h2>
                    <p className="section-description max-w-3xl">
                      {t(galaxyKindDescriptionKeys[entry.id])}
                    </p>
                  </div>
                  <span className="text-xs text-muted">
                    {t('count.libraryObject', {
                      count: sectionItems.length,
                    })}
                  </span>
                </div>

                {sectionItems.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {sectionItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="collection-item-enter"
                        style={{
                          animationDelay: `${index * MOTION_STAGGER_MS}ms`,
                        }}
                      >
                        <GalaxyCard
                          item={item}
                          selectionActive={selection.active}
                          selected={selection.selectedIds.has(item.id)}
                          onToggleSelection={() => selection.toggle(item.id)}
                          onStartSelection={() => selection.start(item.id)}
                          onEdit={() => openEdit(item)}
                          onDuplicate={() => duplicate(item)}
                          onDelete={() => setDeleteTarget(item)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={normalizedQuery ? 'search' : 'galaxies'}
                    title={
                      normalizedQuery
                        ? t('galaxiesScreen.noSearchResults')
                        : t('galaxiesScreen.theValue1SectionIsEmpty', {
                            value1: t(entry.labelKey),
                          })
                    }
                    description={
                      normalizedQuery
                        ? t('galaxiesScreen.noSearchResultsDescription')
                        : t(galaxyKindDescriptionKeys[entry.id])
                    }
                    action={
                      normalizedQuery
                        ? undefined
                        : {
                            label: t(galaxyKindCreateLabelKeys[entry.id]),
                            onPress: () => openCreate(entry.id),
                            icon: <Icon name="plus" className="size-4" />,
                          }
                    }
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
        <div className="space-y-4">
          <ExportSelectionList
            items={items.map((item) => ({
              id: item.id,
              title: item.name,
              description: t(galaxyKindLabelKeys[item.kind], {
                ns: 'common',
              }),
            }))}
            selectedIds={exportIds}
            onChange={(ids) => setExportIds(includeExportDependencies(ids))}
            hint={t(
              'galaxiesScreen.linkedStylesAndSetsAreAddedAutomaticallyForSelectedCharacters',
            )}
          />
          <ExportDestinationPicker
            value={exportDestination}
            onChange={setExportDestination}
          />
        </div>
      </UiModal>

      <UiModal
        isOpen={bulkDeleteOpen}
        onOpenChange={(open) => !open && !saving && setBulkDeleteOpen(false)}
        onConfirm={() => void removeSelected()}
        isConfirmDisabled={selection.selectedIds.size === 0 || saving}
        title={t('selection.deleteSelectedTitle', {
          count: selection.selectedIds.size,
        })}
        description={t('selection.deleteSelectedDescription')}
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={saving}
              onPress={() => setBulkDeleteOpen(false)}
            >
              {t('galaxyEditorModal.cancel')}
            </Button>
            <Button
              variant="danger"
              isPending={saving}
              onPress={() => void removeSelected()}
            >
              {t('galaxyCard.delete')}
            </Button>
          </>
        }
      >
        <div className="max-h-[min(50dvh,24rem)] space-y-2 overflow-y-auto overscroll-contain">
          {items
            .filter((item) => selection.selectedIds.has(item.id))
            .map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-default/45 px-3 py-2 text-sm"
              >
                <span className="font-medium">{item.name}</span>
                <span className="ml-2 text-xs text-muted">
                  {t(galaxyKindLabelKeys[item.kind], { ns: 'common' })}
                </span>
              </div>
            ))}
        </div>
        {error ? (
          <p className="selectable mt-3 text-sm text-danger">{error}</p>
        ) : null}
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
