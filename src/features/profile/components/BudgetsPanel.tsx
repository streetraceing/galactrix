import { Button, Chip, Input } from '@heroui/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { AppPanel } from '../../../components/ui/AppPanel';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { errorMessage } from '../../../lib/errors';
import type {
  AppSettings,
  BudgetSettings,
  BudgetStatus,
  Provider,
  UsagePoint,
} from '../../../types';
import { budgetPercent } from '../budgets';

type DraftRule = {
  providerId: string;
  period: 'day' | 'month';
  tokenLimit: string;
  requestLimit: string;
};

type BudgetLoadState =
  | { phase: 'loading' }
  | { phase: 'error'; detail: string }
  | { phase: 'loaded'; statuses: BudgetStatus[] };

export function budgetUsageForRule(
  state: BudgetLoadState,
  rule: BudgetSettings,
): BudgetStatus | undefined {
  if (state.phase !== 'loaded') return undefined;
  return state.statuses.find(
    (status) =>
      status.ruleId === rule.id &&
      status.period === rule.period &&
      (status.providerId || undefined) === (rule.providerId || undefined) &&
      status.tokenLimit === rule.tokenLimit &&
      status.requestLimit === rule.requestLimit &&
      Number.isFinite(status.usedTokens) &&
      status.usedTokens >= 0 &&
      Number.isFinite(status.usedRequests) &&
      status.usedRequests >= 0,
  );
}

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
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-xs text-muted">{label}</span>
        <span
          className={`text-xs tabular-nums ${percent >= 100 ? 'font-semibold text-danger' : 'text-muted'}`}
        >
          {usedLabel}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-default">
        <div
          className={`h-full rounded-full transition-[width] duration-(--motion-standard) ease-(--motion-ease) ${percent >= 100 ? 'bg-danger' : 'bg-accent'}`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuetext={usedLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}

function createRuleId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID();
  return `budget-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function BudgetsPanel({
  settings,
  providers,
  usage,
  onGetStatus,
  onChangeSettings,
}: {
  settings: AppSettings;
  providers: Provider[];
  usage?: readonly UsagePoint[];
  onGetStatus: () => Promise<BudgetStatus[]>;
  onChangeSettings: (settings: AppSettings) => Promise<boolean>;
}) {
  const { t } = useTranslation('profile');
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const loadingRef = useRef(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const tokenLimitId = useId();
  const requestLimitId = useId();
  const rules = settings.budgets;
  const source = useMemo(
    () => ({ rules, providers, usage, onGetStatus, retry }),
    [rules, providers, usage, onGetStatus, retry],
  );
  const [result, setResult] = useState<{
    source: typeof source;
    state: BudgetLoadState;
  } | null>(null);
  // Never render the previous request's values against new rules or usage.
  const loadState: BudgetLoadState =
    result?.source === source ? result.state : { phase: 'loading' };
  const loading = loadState.phase === 'loading';
  const [draft, setDraft] = useState<DraftRule>({
    providerId: '',
    period: 'day',
    tokenLimit: '',
    requestLimit: '',
  });

  useEffect(() => {
    let active = true;
    loadingRef.current = true;
    void (async () => {
      try {
        const statuses = await source.onGetStatus();
        if (active) setResult({ source, state: { phase: 'loaded', statuses } });
      } catch (caught) {
        if (active)
          setResult({
            source,
            state: { phase: 'error', detail: errorMessage(caught) },
          });
      } finally {
        if (active) loadingRef.current = false;
      }
    })();
    return () => {
      active = false;
    };
  }, [source]);

  const retryStatuses = () => {
    if (loadingRef.current || loading) return;
    loadingRef.current = true;
    setRetry((current) => current + 1);
  };

  const statusUnavailable =
    loadState.phase === 'error' ||
    (loadState.phase === 'loaded' &&
      rules.some((rule) => !budgetUsageForRule(loadState, rule)));

  const persist = async (budgets: BudgetSettings[]): Promise<boolean> => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await onChangeSettings({ ...settings, budgets });
      if (!saved) {
        setSaveError(t('errors.chatActionFailed', { ns: 'common' }));
        return false;
      }
      setRetry((current) => current + 1);
      return true;
    } catch (caught) {
      setSaveError(
        `${t('errors.chatActionFailed', { ns: 'common' })}: ${errorMessage(caught)}`,
      );
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

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
    if (!canAdd || savingRef.current) return;
    const rule: BudgetSettings = {
      id: createRuleId(),
      providerId: draft.providerId || undefined,
      period: draft.period,
      tokenLimit: Number.isFinite(draftTokenLimit) ? draftTokenLimit : 0,
      requestLimit: Number.isFinite(draftRequestLimit) ? draftRequestLimit : 0,
    };
    const saved = await persist([...settings.budgets, rule]);
    if (saved)
      setDraft((current) => ({ ...current, tokenLimit: '', requestLimit: '' }));
  };

  const deleteRule = async (ruleId: string) => {
    await persist(settings.budgets.filter((rule) => rule.id !== ruleId));
  };

  return (
    <div className="space-y-4 pb-5 sm:space-y-5 sm:pb-6">
      {saveError ? (
        <p role="alert" className="break-words text-sm text-danger">
          {saveError}
        </p>
      ) : null}
      <AppPanel className="p-4 sm:p-5">
        <SectionHeader
          title={t('budgets.title')}
          description={t('budgets.description')}
        />
        <div role="status" aria-live="polite" aria-atomic="true">
          {loading ? (
            <p className="mt-3 text-sm text-muted">{t('budgets.loading')}</p>
          ) : null}
        </div>
        {statusUnavailable ? (
          <div className="mt-3 space-y-2">
            <p role="alert" className="break-words text-sm text-danger">
              {t('budgets.loadFailed')}
              {loadState.phase === 'error' ? `: ${loadState.detail}` : ''}
            </p>
            <Button
              variant="secondary"
              className="min-h-[44px] w-full sm:w-auto"
              onPress={retryStatuses}
              isDisabled={loading}
            >
              {t('actions.retry', { ns: 'common' })}
            </Button>
          </div>
        ) : null}
        {settings.budgets.length === 0 ? (
          <p
            role="status"
            className="mt-4 rounded-xl border border-default bg-background/55 px-3 py-2.5 text-sm text-muted"
          >
            {t('budgets.empty')}
          </p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {settings.budgets.map((rule) => {
              const status = budgetUsageForRule(loadState, rule);
              const exceeded =
                status &&
                ((rule.tokenLimit > 0 &&
                  status.usedTokens >= rule.tokenLimit) ||
                  (rule.requestLimit > 0 &&
                    status.usedRequests >= rule.requestLimit));
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
                      className={`bg-transparent ${exceeded ? 'text-danger' : 'text-muted'}`}
                    >
                      {rule.period === 'month'
                        ? t('budgets.periodMonth')
                        : t('budgets.periodDay')}
                      {exceeded ? ` · ${t('budgets.exceededBadge')}` : ''}
                    </Chip>
                  </div>
                  {status ? (
                    <div className="mt-2 space-y-2">
                      {rule.tokenLimit > 0 ? (
                        <ProgressRow
                          label={t('budgets.tokens')}
                          used={status.usedTokens}
                          limit={rule.tokenLimit}
                          usedLabel={t('budgets.used', {
                            used: status.usedTokens,
                            limit: rule.tokenLimit,
                          })}
                        />
                      ) : null}
                      {rule.requestLimit > 0 ? (
                        <ProgressRow
                          label={t('budgets.requests')}
                          used={status.usedRequests}
                          limit={rule.requestLimit}
                          usedLabel={t('budgets.used', {
                            used: status.usedRequests,
                            limit: rule.requestLimit,
                          })}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted">
                      {loading ? t('budgets.loading') : t('budgets.loadFailed')}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 min-h-[44px] w-full text-danger sm:w-auto"
                    isDisabled={saving}
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
        <fieldset disabled={saving} className="mt-4 min-w-0 space-y-3">
          <div>
            <p className="text-sm font-medium">{t('budgets.provider')}</p>
            <div
              role="group"
              aria-label={t('budgets.provider')}
              className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              <button
                type="button"
                aria-pressed={draft.providerId === ''}
                onClick={() => setDraft((c) => ({ ...c, providerId: '' }))}
                className={`inline-flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${draft.providerId === '' ? 'border-accent bg-accent/10 text-accent' : 'border-default bg-transparent text-muted hover:bg-surface'}`}
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
                    className={`inline-flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${active ? 'border-accent bg-accent/10 text-accent' : 'border-default bg-transparent text-muted hover:bg-surface'}`}
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
            <div
              role="group"
              aria-label={t('budgets.period')}
              className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {(['day', 'month'] as const).map((period) => (
                <Button
                  key={period}
                  variant={draft.period === period ? 'primary' : 'secondary'}
                  fullWidth
                  className="min-h-[44px]"
                  aria-pressed={draft.period === period}
                  isDisabled={saving}
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
              <label htmlFor={tokenLimitId} className="text-sm font-medium">
                {t('budgets.tokenLimit')}
              </label>
              <Input
                id={tokenLimitId}
                disabled={saving}
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
              <label htmlFor={requestLimitId} className="text-sm font-medium">
                {t('budgets.requestLimit')}
              </label>
              <Input
                id={requestLimitId}
                disabled={saving}
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
            className="min-h-[44px]"
            isDisabled={saving || !canAdd}
            isPending={saving}
            onPress={() => void addRule()}
          >
            <Icon name="plus" className="size-4" />
            {t('budgets.addRule')}
          </Button>
          {!canAdd && (draft.tokenLimit !== '' || draft.requestLimit !== '') ? (
            <p className="text-xs text-warning">{t('budgets.limitRequired')}</p>
          ) : null}
        </fieldset>
      </AppPanel>
    </div>
  );
}
