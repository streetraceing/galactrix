import { Button, Chip, Input } from '@heroui/react';
import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { AppPanel } from '../../../components/ui/AppPanel';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { toast } from '../../../i18n/toast';
import { errorMessage } from '../../../lib/errors';
import type {
  AppSettings,
  BudgetSettings,
  BudgetStatus,
  Provider,
} from '../../../types';
import { budgetPercent } from '../budgets';

type DraftRule = {
  providerId: string;
  period: 'day' | 'month';
  tokenLimit: string;
  requestLimit: string;
};

function ProgressRow({
  label,
  used,
  limit,
  usedLabel,
}: {
  label: string;
  used: number;
  limit: number;
  usedLabel: string;
}) {
  const percent = budgetPercent(used, limit);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted">{label}</span>
        <span
          className={`text-xs tabular-nums ${percent >= 100 ? 'font-semibold text-danger' : 'text-muted'}`}
        >
          {usedLabel}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-default">
        <div
          className={`h-full rounded-full transition-[width] duration-(--motion-standard) ease-(--motion-ease) ${
            percent >= 100 ? 'bg-danger' : 'bg-accent'
          }`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}

function createRuleId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `budget-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function BudgetsPanel({
  settings,
  providers,
  onGetStatus,
  onChangeSettings,
}: {
  settings: AppSettings;
  providers: Provider[];
  onGetStatus: () => Promise<BudgetStatus[]>;
  onChangeSettings: (settings: AppSettings) => Promise<boolean>;
}) {
  const { t } = useTranslation('profile');
  const [statuses, setStatuses] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DraftRule>({
    providerId: '',
    period: 'day',
    tokenLimit: '',
    requestLimit: '',
  });

  const loadStatuses = useCallback(async () => {
    setLoading(true);
    try {
      setStatuses(await onGetStatus());
    } catch (caught) {
      toast.danger(t('budgets.loadFailed'), {
        description: errorMessage(caught),
      });
    } finally {
      setLoading(false);
    }
  }, [onGetStatus, t]);

  useEffect(() => {
    void loadStatuses();
  }, [loadStatuses]);

  const providerName = (providerId: string | undefined | null) => {
    if (!providerId) return t('budgets.allProviders');
    return (
      providers.find((provider) => provider.id === providerId)?.name ??
      t('budgets.allProviders')
    );
  };

  const draftTokenLimit = Number.parseInt(draft.tokenLimit, 10);
  const draftRequestLimit = Number.parseInt(draft.requestLimit, 10);
  const canAdd =
    (Number.isFinite(draftTokenLimit) && draftTokenLimit > 0) ||
    (Number.isFinite(draftRequestLimit) && draftRequestLimit > 0);

  const addRule = async () => {
    if (!canAdd) return;
    const rule: BudgetSettings = {
      id: createRuleId(),
      providerId: draft.providerId || undefined,
      period: draft.period,
      tokenLimit: Number.isFinite(draftTokenLimit) ? draftTokenLimit : 0,
      requestLimit: Number.isFinite(draftRequestLimit) ? draftRequestLimit : 0,
    };
    await onChangeSettings({
      ...settings,
      budgets: [...settings.budgets, rule],
    });
    setDraft((current) => ({ ...current, tokenLimit: '', requestLimit: '' }));
    void loadStatuses();
  };

  const deleteRule = async (ruleId: string) => {
    await onChangeSettings({
      ...settings,
      budgets: settings.budgets.filter((rule) => rule.id !== ruleId),
    });
    void loadStatuses();
  };

  return (
    <div className="space-y-4 pb-5 sm:space-y-5 sm:pb-6">
      <AppPanel className="p-4 sm:p-5">
        <SectionHeader
          title={t('budgets.title')}
          description={t('budgets.description')}
        />

        {settings.budgets.length === 0 ? (
          <p
            role="status"
            className="mt-4 rounded-xl border border-default bg-background/55 px-3 py-2.5 text-sm text-muted"
          >
            {loading ? t('budgets.loading') : t('budgets.empty')}
          </p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {settings.budgets.map((rule) => {
              const status = statuses.find(
                (candidate) => candidate.ruleId === rule.id,
              );
              const usedTokens = status?.usedTokens ?? 0;
              const usedRequests = status?.usedRequests ?? 0;
              const exceeded =
                (rule.tokenLimit > 0 && usedTokens >= rule.tokenLimit) ||
                (rule.requestLimit > 0 && usedRequests >= rule.requestLimit);
              return (
                <div
                  key={rule.id}
                  className="rounded-2xl border border-separator p-3"
                >
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <strong className="min-w-0 truncate text-sm font-semibold">
                      {providerName(rule.providerId)}
                    </strong>
                    <Chip
                      size="sm"
                      variant="soft"
                      className={`bg-transparent ${
                        exceeded ? 'text-danger' : 'text-muted'
                      }`}
                    >
                      {rule.period === 'month'
                        ? t('budgets.periodMonth')
                        : t('budgets.periodDay')}
                      {exceeded ? ` · ${t('budgets.exceededBadge')}` : ''}
                    </Chip>
                  </div>
                  <div className="mt-2 space-y-2">
                    {rule.tokenLimit > 0 ? (
                      <ProgressRow
                        label={t('budgets.tokens')}
                        used={usedTokens}
                        limit={rule.tokenLimit}
                        usedLabel={t('budgets.used', {
                          used: usedTokens,
                          limit: rule.tokenLimit,
                        })}
                      />
                    ) : null}
                    {rule.requestLimit > 0 ? (
                      <ProgressRow
                        label={t('budgets.requests')}
                        used={usedRequests}
                        limit={rule.requestLimit}
                        usedLabel={t('budgets.used', {
                          used: usedRequests,
                          limit: rule.requestLimit,
                        })}
                      />
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 w-full text-danger sm:w-auto"
                    onPress={() => void deleteRule(rule.id)}
                  >
                    <Icon name="trash" className="size-4" />
                    {t('budgets.delete')}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </AppPanel>

      <AppPanel className="p-4 sm:p-5">
        <SectionHeader title={t('budgets.addRule')} />

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm font-medium">{t('budgets.provider')}</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={draft.providerId === ''}
                onClick={() => setDraft((c) => ({ ...c, providerId: '' }))}
                className={`inline-flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
                  draft.providerId === ''
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-default bg-transparent text-muted hover:bg-surface'
                }`}
              >
                {t('budgets.allProviders')}
                {draft.providerId === '' ? (
                  <Icon name="check" className="size-4" />
                ) : null}
              </button>
              {providers.map((provider) => {
                const active = draft.providerId === provider.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setDraft((c) => ({ ...c, providerId: provider.id }))
                    }
                    className={`inline-flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
                      active
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-default bg-transparent text-muted hover:bg-surface'
                    }`}
                  >
                    <span className="min-w-0 truncate">{provider.name}</span>
                    {active ? <Icon name="check" className="size-4" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">{t('budgets.period')}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['day', 'month'] as const).map((period) => (
                <Button
                  key={period}
                  variant={draft.period === period ? 'primary' : 'secondary'}
                  fullWidth
                  onPress={() => setDraft((c) => ({ ...c, period }))}
                >
                  {t(
                    period === 'day'
                      ? 'budgets.periodDay'
                      : 'budgets.periodMonth',
                  )}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">{t('budgets.tokenLimit')}</p>
              <Input
                aria-label={t('budgets.tokenLimit')}
                autoComplete="off"
                fullWidth
                variant="secondary"
                inputMode="numeric"
                value={draft.tokenLimit}
                placeholder="0"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDraft((c) => ({
                    ...c,
                    tokenLimit: event.target.value.replace(/[^\d]/g, ''),
                  }))
                }
              />
            </div>
            <div>
              <p className="text-sm font-medium">{t('budgets.requestLimit')}</p>
              <Input
                aria-label={t('budgets.requestLimit')}
                autoComplete="off"
                fullWidth
                variant="secondary"
                inputMode="numeric"
                value={draft.requestLimit}
                placeholder="0"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDraft((c) => ({
                    ...c,
                    requestLimit: event.target.value.replace(/[^\d]/g, ''),
                  }))
                }
              />
            </div>
          </div>

          <Button
            variant="primary"
            fullWidth
            isDisabled={!canAdd}
            onPress={() => void addRule()}
          >
            <Icon name="plus" className="size-4" />
            {t('budgets.addRule')}
          </Button>
          {!canAdd && (draft.tokenLimit !== '' || draft.requestLimit !== '') ? (
            <p className="text-xs text-warning">{t('budgets.limitRequired')}</p>
          ) : null}
        </div>
      </AppPanel>
    </div>
  );
}
