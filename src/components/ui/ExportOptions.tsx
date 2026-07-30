import { Button, Checkbox, Surface } from '@heroui/react';
import { Icon, type IconName } from '../Icon';
import {
  canChooseExportFile,
  canDownloadExportFile,
  canShareExportFile,
  type ExportDestination,
} from '../../lib/jsonTransfer';
import type { TranslationKey } from '../../i18n';
import { useTranslation } from 'react-i18next';

const destinationOptions: Array<{
  id: ExportDestination;
  titleKey: TranslationKey<'common'>;
  descriptionKey: TranslationKey<'common'>;
  icon: IconName;
  available: () => boolean;
}> = [
  {
    id: 'choose-file',
    titleKey: 'export.destination.chooseFile.title',
    descriptionKey: 'export.destination.chooseFile.description',
    icon: 'download',
    available: canChooseExportFile,
  },
  {
    id: 'share',
    titleKey: 'export.destination.share.title',
    descriptionKey: 'export.destination.share.description',
    icon: 'upload',
    available: canShareExportFile,
  },
  {
    id: 'downloads',
    titleKey: 'export.destination.downloads.title',
    descriptionKey: 'export.destination.downloads.description',
    icon: 'download',
    available: canDownloadExportFile,
  },
];

export function ExportDestinationPicker({
  value,
  onChange,
}: {
  value: ExportDestination;
  onChange: (value: ExportDestination) => void;
}) {
  const { t } = useTranslation('common');
  return (
    <section>
      <h3 className="text-sm font-semibold">
        {t('exportOptions.exportDestination')}
      </h3>
      <div className="mt-2 flex flex-col gap-2">
        {destinationOptions
          .filter((option) => option.available())
          .map((option) => {
            const selected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
                  selected
                    ? 'border-accent bg-accent/10'
                    : 'border-separator bg-surface-secondary/50 hover:bg-surface-secondary'
                }`}
                aria-pressed={selected}
                onClick={() => onChange(option.id)}
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                    selected
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-default text-muted'
                  }`}
                >
                  <Icon name={option.icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">
                    {t(option.titleKey)}
                  </strong>
                  <span className="mt-0.5 block text-xs leading-5 text-muted">
                    {t(option.descriptionKey)}
                  </span>
                </span>
                {selected ? (
                  <Icon name="check" className="mt-2 size-4 text-accent" />
                ) : (
                  <div className="size-4" />
                )}
              </button>
            );
          })}
      </div>
    </section>
  );
}

export function ExportSelectionList({
  items,
  selectedIds,
  onChange,
}: {
  items: Array<{ id: string; title: string; description?: string }>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useTranslation('common');
  const selected = new Set(selectedIds);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">
          {t('exportOptions.whatToExport')}
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onPress={() =>
            onChange(allSelected ? [] : items.map((item) => item.id))
          }
        >
          {allSelected
            ? t('exportOptions.clearSelection')
            : t('exportOptions.selectAll')}
        </Button>
      </div>
      <Surface className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-separator p-1">
        {items.map((item) => (
          <Checkbox
            key={item.id}
            isSelected={selected.has(item.id)}
            variant="secondary"
            className="w-full rounded-lg"
            onChange={(checked) =>
              onChange(
                checked
                  ? [...selectedIds, item.id]
                  : selectedIds.filter((id) => id !== item.id),
              )
            }
          >
            <Checkbox.Content className="w-full items-start px-3 py-2.5">
              <Checkbox.Control className="mt-0.5">
                <Checkbox.Indicator />
              </Checkbox.Control>
              <span className="min-w-0">
                <strong className="block truncate text-sm font-medium">
                  {item.title}
                </strong>
                {item.description ? (
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </Checkbox.Content>
          </Checkbox>
        ))}
      </Surface>
      <p className="mt-2 text-xs text-muted">
        {t('exportOptions.selected')}
        {selectedIds.length} {t('exportOptions.of')}
        {items.length}
      </p>
    </section>
  );
}
