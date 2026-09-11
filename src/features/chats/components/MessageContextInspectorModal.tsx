import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { AppPanel } from '../../../components/ui/AppPanel';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { UiModal } from '../../../components/ui/UiModal';
import type { TranslationKey } from '../../../i18n';
import type { ContextReport, Message } from '../../../types';
import {
  INSPECTOR_CLEANUP_KEYS,
  INSPECTOR_MODE_KEYS,
  INSPECTOR_REASON_KEYS,
  INSPECTOR_SECTION_KEYS,
  INSPECTOR_TRUNCATION_KEYS,
} from '../contextReport';
import { promptPresets, promptPriorities } from '../promptConfig';

function formatTokens(value: number, formatter: Intl.NumberFormat): string {
  return `~${formatter.format(value)}`;
}

export function MessageContextInspectorModal({
  message,
  onClose,
}: {
  message: Message | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('chats');
  const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);

  const report: ContextReport | null = useMemo(() => {
    if (!message || message.role !== 'assistant') return null;
    return (
      message.variants.find(
        (variant) => variant.index === message.activeVariantIndex,
      )?.report ?? null
    );
  }, [message]);

  const ruleLabels = useMemo(
    () =>
      new Map<string, TranslationKey<'chats'>>(
        promptPresets.map((preset) => [preset.id, preset.labelKey]),
      ),
    [],
  );
  const priorityLabels = useMemo(
    () =>
      new Map<string, TranslationKey<'chats'>>(
        promptPriorities.map((priority) => [priority.id, priority.labelKey]),
      ),
    [],
  );

  return (
    <UiModal
      isOpen={message != null}
      onOpenChange={(open) => !open && onClose()}
      title={t('inspector.title')}
      description={
        report
          ? t('inspector.description', {
              provider: report.providerName,
              model: report.model,
            })
          : t('inspector.noReportDescription')
      }
      size="cover"
      footer={
        <button
          type="button"
          className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-muted outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-focus"
          onClick={onClose}
        >
          {t('inspector.close')}
        </button>
      }
    >
      {report ? (
        <div className="space-y-4">
          <AppPanel emphasis="subtle" className="p-4">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted">
                  {t('inspector.estimatedTokens')}
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {formatTokens(
                    report.estimatedTokens.totalTokens,
                    numberFormatter,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">
                  {t('inspector.reportedTokens')}
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {report.reportedUsage
                    ? `${numberFormatter.format(report.reportedUsage.inputTokens)} / ${numberFormatter.format(report.reportedUsage.outputTokens)}`
                    : t('inspector.usageNotReported')}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t('inspector.latency')}</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {report.latencyMs != null
                    ? t('inspector.latencyMs', {
                        value: numberFormatter.format(report.latencyMs),
                      })
                    : t('inspector.valueUnknown')}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t('inspector.mode')}</dt>
                <dd className="mt-1 font-semibold">
                  {t(INSPECTOR_MODE_KEYS[report.mode])}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-muted">
              {t('inspector.estimateBreakdown', {
                system: numberFormatter.format(
                  report.estimatedTokens.systemTokens,
                ),
                history: numberFormatter.format(
                  report.estimatedTokens.historyTokens,
                ),
              })}
              {' · '}
              {t('inspector.reportedHint')}
            </p>
          </AppPanel>

          <AppPanel emphasis="subtle" className="p-4">
            <SectionHeader title={t('inspector.sectionsTitle')} />
            {report.sections.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                {t('inspector.noSections')}
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {report.sections.map((section, index) => {
                  const labelKey = INSPECTOR_SECTION_KEYS[section.id];
                  const priorityKey = priorityLabels.get(section.priority);
                  return (
                    <li
                      key={`${section.id}-${index}`}
                      className="flex items-start gap-2.5 rounded-xl bg-background/55 px-3 py-2"
                    >
                      <Icon
                        name={section.included ? 'check' : 'close'}
                        className={`mt-0.5 size-4 shrink-0 ${
                          section.included ? 'text-success' : 'text-danger'
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <strong className="text-sm">
                            {labelKey ? t(labelKey) : section.id}
                          </strong>
                          <span className="text-xs tabular-nums text-muted">
                            {section.included
                              ? formatTokens(
                                  section.approximateTokens,
                                  numberFormatter,
                                )
                              : t('inspector.omitted')}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {section.title}
                          {section.included && priorityKey
                            ? ` · ${t(priorityKey)}`
                            : ''}
                          {section.omittedReason
                            ? ` · ${
                                INSPECTOR_REASON_KEYS[section.omittedReason]
                                  ? t(
                                      INSPECTOR_REASON_KEYS[
                                        section.omittedReason
                                      ],
                                    )
                                  : section.omittedReason
                              }`
                            : ''}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </AppPanel>

          <AppPanel emphasis="subtle" className="p-4">
            <SectionHeader title={t('inspector.historyTitle')} />
            {report.truncations.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                {t('inspector.historyIntact')}
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {report.truncations.map((truncation, index) => {
                  const labelKey = INSPECTOR_TRUNCATION_KEYS[truncation.id];
                  return (
                    <li
                      key={`${truncation.id}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-background/55 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        {labelKey ? t(labelKey) : truncation.id}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted">
                        {numberFormatter.format(truncation.before)} →{' '}
                        {numberFormatter.format(truncation.after)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </AppPanel>

          <AppPanel emphasis="subtle" className="p-4">
            <SectionHeader title={t('inspector.rulesTitle')} />
            {report.promptRules.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                {t('inspector.noRules')}
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {report.promptRules.map((rule) => {
                  const labelKey = ruleLabels.get(rule);
                  return (
                    <span
                      key={rule}
                      className="rounded-full bg-background/55 px-2.5 py-1 text-xs font-medium text-muted"
                    >
                      {labelKey ? t(labelKey) : rule}
                    </span>
                  );
                })}
              </div>
            )}

            <ul className="mt-4 space-y-1.5 text-sm">
              <li className="flex items-center justify-between gap-3 rounded-xl bg-background/55 px-3 py-2">
                <span>{t('inspector.module.dynamicContext')}</span>
                <span className="text-xs font-medium text-muted">
                  {t(
                    report.modules.dynamicContext
                      ? report.modules.dynamicContextAnalysis
                        ? 'inspector.module.dynamicContextAnalysis'
                        : 'inspector.module.on'
                      : 'inspector.module.off',
                  )}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-xl bg-background/55 px-3 py-2">
                <span>{t('inspector.module.semanticMemory')}</span>
                <span className="text-xs font-medium text-muted">
                  {report.modules.semanticMemory
                    ? t('inspector.module.semanticMemorySelected', {
                        count: report.modules.semanticMemorySelected,
                      })
                    : t('inspector.module.off')}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-xl bg-background/55 px-3 py-2">
                <span>{t('inspector.module.repetitionGuard')}</span>
                <span className="text-xs font-medium text-muted">
                  {t(
                    report.modules.repetitionGuard
                      ? 'inspector.module.on'
                      : 'inspector.module.off',
                  )}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-xl bg-background/55 px-3 py-2">
                <span>{t('inspector.module.responseCleanup')}</span>
                <span className="max-w-[60%] truncate text-right text-xs font-medium text-muted">
                  {report.modules.responseCleanup.length === 0
                    ? t('inspector.module.off')
                    : report.modules.responseCleanup
                        .map((step) =>
                          INSPECTOR_CLEANUP_KEYS[step]
                            ? t(INSPECTOR_CLEANUP_KEYS[step])
                            : step,
                        )
                        .join(', ')}
                </span>
              </li>
            </ul>
          </AppPanel>
        </div>
      ) : (
        <p className="rounded-xl border border-default bg-background/55 px-3 py-3 text-sm leading-6 text-muted">
          {t('inspector.noReport')}
        </p>
      )}
    </UiModal>
  );
}
