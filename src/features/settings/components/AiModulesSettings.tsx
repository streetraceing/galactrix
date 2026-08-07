import { SearchField } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AiModuleId, AiModuleSettings, Provider } from '../../../types';
import { ContextBudgetModuleSettings } from './ContextBudgetModuleSettings';
import { DynamicContextModuleSettings } from './DynamicContextModuleSettings';
import { RepetitionGuardModuleSettings } from './RepetitionGuardModuleSettings';
import { ResponseCleanupModuleSettings } from './ResponseCleanupModuleSettings';
import { RetryModuleSettings } from './RetryModuleSettings';
import { SemanticMemoryModuleSettings } from './SemanticMemoryModuleSettings';

export function AiModulesSettings({
  value,
  providers,
  onChange,
}: {
  value: AiModuleSettings;
  providers: Provider[];
  onChange: (value: AiModuleSettings) => void;
}) {
  const { t } = useTranslation('settings');
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const moduleCatalog: Array<{
    id: AiModuleId;
    title: string;
    description: string;
  }> = [
    {
      id: 'retry',
      title: t('ai.retry.title'),
      description: t('ai.retry.description'),
    },
    {
      id: 'dynamicContext',
      title: t('ai.dynamic.title'),
      description: t('ai.dynamic.description'),
    },
    {
      id: 'semanticMemory',
      title: t('ai.semantic.title'),
      description: t('ai.semantic.description'),
    },
    {
      id: 'contextBudget',
      title: t('ai.contextBudget.title'),
      description: t('ai.contextBudget.description'),
    },
    {
      id: 'repetitionGuard',
      title: t('ai.repetitionGuard.title'),
      description: t('ai.repetitionGuard.description'),
    },
    {
      id: 'responseCleanup',
      title: t('ai.responseCleanup.title'),
      description: t('ai.responseCleanup.description'),
    },
  ];
  const visibleModuleIds = new Set(
    moduleCatalog
      .filter(({ title, description }) =>
        `${title} ${description}`.toLocaleLowerCase().includes(normalizedQuery),
      )
      .map(({ id }) => id),
  );

  return (
    <section className="w-full min-w-0 max-w-full">
      <SearchField
        fullWidth
        variant="secondary"
        value={query}
        onChange={setQuery}
        className="mb-4 sm:mb-5"
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input
            autoComplete="off"
            placeholder={t('ai.modules.search')}
            aria-label={t('ai.modules.search')}
          />
          <SearchField.ClearButton aria-label={t('ai.modules.clearSearch')} />
        </SearchField.Group>
      </SearchField>

      <div className="space-y-4 sm:space-y-5">
        <div hidden={!visibleModuleIds.has('retry')}>
          <RetryModuleSettings
            value={value.retry}
            onChange={(retry) => onChange({ ...value, retry })}
          />
        </div>
        <div hidden={!visibleModuleIds.has('dynamicContext')}>
          <DynamicContextModuleSettings
            value={value.dynamicContext}
            providers={providers}
            onChange={(dynamicContext) =>
              onChange({ ...value, dynamicContext })
            }
          />
        </div>
        <div hidden={!visibleModuleIds.has('semanticMemory')}>
          <SemanticMemoryModuleSettings
            value={value.semanticMemory}
            providers={providers}
            onChange={(semanticMemory) =>
              onChange({ ...value, semanticMemory })
            }
          />
        </div>
        <div hidden={!visibleModuleIds.has('contextBudget')}>
          <ContextBudgetModuleSettings
            value={value.contextBudget}
            onChange={(contextBudget) => onChange({ ...value, contextBudget })}
          />
        </div>
        <div hidden={!visibleModuleIds.has('repetitionGuard')}>
          <RepetitionGuardModuleSettings
            value={value.repetitionGuard}
            onChange={(repetitionGuard) =>
              onChange({ ...value, repetitionGuard })
            }
          />
        </div>
        <div hidden={!visibleModuleIds.has('responseCleanup')}>
          <ResponseCleanupModuleSettings
            value={value.responseCleanup}
            onChange={(responseCleanup) =>
              onChange({ ...value, responseCleanup })
            }
          />
        </div>
        {visibleModuleIds.size === 0 ? (
          <div className="rounded-2xl border border-dashed border-separator px-5 py-10 text-center">
            <strong className="block text-sm font-medium">
              {t('ai.modules.noResults')}
            </strong>
            <p className="mt-1 text-xs leading-5 text-muted">
              {t('ai.modules.noResultsDescription')}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
