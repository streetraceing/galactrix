import { Input, Label, ListBox, Select, Surface } from '@heroui/react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type Key,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../../../components/Icon';
import {
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from '../../../lib/storage';
import type { Provider } from '../../../types';
import { SettingSwitchRow } from '../../profile/components/SettingSwitchRow';

export function ModuleNumberField({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(() => String(value));
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    editingRef.current = false;
    const parsed = Number(draft);

    if (draft.trim() === '' || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }

    const next = Math.min(max, Math.max(min, parsed));
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <div className="grid min-w-0 gap-3 py-3 first:pt-0 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center">
      <div className="min-w-0">
        <strong className="block text-sm font-medium">{label}</strong>
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      </div>
      <Input
        type="number"
        fullWidth
        variant="secondary"
        min={min}
        max={max}
        step={step}
        value={draft}
        inputMode={step % 1 === 0 ? 'numeric' : 'decimal'}
        aria-label={label}
        onFocus={() => {
          editingRef.current = true;
        }}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const rawValue = event.target.value;
          setDraft(rawValue);

          const next = Number(rawValue);
          if (rawValue.trim() !== '' && Number.isFinite(next)) {
            onChange(Math.min(max, Math.max(min, next)));
          }
        }}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
    </div>
  );
}

export function ModuleProviderSelect({
  label,
  description,
  value,
  providers,
  automaticLabel,
  onChange,
}: {
  label: string;
  description: string;
  value?: string;
  providers: Provider[];
  automaticLabel: string;
  onChange: (value?: string) => void;
}) {
  return (
    <div className="min-w-0 py-3 first:pt-0">
      <Label>{label}</Label>
      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      <Select
        className="mt-2 min-w-0 max-w-full"
        fullWidth
        variant="secondary"
        value={value ?? '__automatic__'}
        aria-label={label}
        onChange={(key: Key | Key[] | null) => {
          const selected = String(key ?? '__automatic__');
          onChange(selected === '__automatic__' ? undefined : selected);
        }}
      >
        <Select.Trigger className="w-full min-w-0 max-w-full">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="__automatic__" textValue={automaticLabel}>
              <span>{automaticLabel}</span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {providers.map((provider) => (
              <ListBox.Item
                id={provider.id}
                key={provider.id}
                textValue={provider.name}
              >
                <div className="min-w-0">
                  <strong className="block truncate text-sm">
                    {provider.name}
                  </strong>
                  <span className="block truncate text-xs text-muted">
                    {provider.embeddingModel || provider.model}
                  </span>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}

const MODULE_COLLAPSE_STORAGE_PREFIX = 'galactrix.aiModuleCollapsed.';

function moduleCollapseStorageKey(moduleId: string) {
  return `${MODULE_COLLAPSE_STORAGE_PREFIX}${moduleId}`;
}

function readModuleExpanded(moduleId: string, enabled: boolean) {
  if (!enabled) return false;
  return readStorageItem(moduleCollapseStorageKey(moduleId)) !== 'true';
}

function persistModuleCollapsed(moduleId: string, collapsed: boolean) {
  const key = moduleCollapseStorageKey(moduleId);
  if (collapsed) writeStorageItem(key, 'true');
  else removeStorageItem(key);
}

export function ModuleSettingsCard({
  moduleId,
  icon,
  title,
  description,
  enabledLabel,
  enabledDescription,
  enabled,
  onEnabledChange,
  children,
}: {
  moduleId: string;
  icon: IconName;
  title: string;
  description: string;
  enabledLabel: string;
  enabledDescription: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation('settings');
  const [isExpanded, setIsExpanded] = useState(() =>
    readModuleExpanded(moduleId, enabled),
  );
  const previousEnabledRef = useRef(enabled);
  const panelId = useId();
  const detailsVisible = enabled && isExpanded;

  useEffect(() => {
    if (previousEnabledRef.current === enabled) return;
    previousEnabledRef.current = enabled;
    persistModuleCollapsed(moduleId, false);
    setIsExpanded(enabled);
  }, [enabled, moduleId]);

  return (
    <Surface className="settings-card-enter w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-separator bg-surface p-4 shadow-surface ring-1 ring-inset ring-foreground/5 transition sm:p-5">
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-3 rounded-xl text-left outline-none transition focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-default"
        aria-expanded={detailsVisible}
        aria-controls={panelId}
        aria-label={t(
          detailsVisible
            ? 'ai.module.collapseSettings'
            : 'ai.module.expandSettings',
          { module: title },
        )}
        disabled={!enabled}
        onClick={() =>
          setIsExpanded((current) => {
            const next = !current;
            persistModuleCollapsed(moduleId, !next);
            return next;
          })
        }
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icon name={icon} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="section-title block">{title}</span>
          <span className="section-description block">{description}</span>
        </span>
        <Icon
          name="chevron"
          className={`size-4 shrink-0 text-muted transition-transform duration-(--motion-standard) ease-(--motion-ease) ${detailsVisible ? 'rotate-90' : ''}`}
        />
      </button>

      <div className="mt-4">
        <SettingSwitchRow
          label={enabledLabel}
          description={enabledDescription}
          value={enabled}
          onChange={(nextEnabled) => {
            persistModuleCollapsed(moduleId, false);
            setIsExpanded(nextEnabled);
            onEnabledChange(nextEnabled);
          }}
        />
        <div
          className={`grid transition-[grid-template-rows,margin-top,opacity] duration-(--motion-standard) ease-(--motion-ease) motion-reduce:transition-none ${
            detailsVisible
              ? 'mt-3 grid-rows-[1fr] opacity-100'
              : 'mt-0 grid-rows-[0fr] opacity-0'
          }`}
          aria-hidden={!detailsVisible}
          inert={!detailsVisible}
        >
          <div className="-mx-1 min-h-0 overflow-hidden px-1 sm:mx-0 sm:px-0">
            <div
              id={panelId}
              className="divide-y divide-separator border-t border-separator pt-3"
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}
