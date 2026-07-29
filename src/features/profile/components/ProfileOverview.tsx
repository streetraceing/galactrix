import { Surface } from '@heroui/react';
import { MetricGrid } from '../../../components/ui/MetricGrid';
import { formatNumber, i18next } from '../../../i18n';
import type { GalaxyItem, UsagePoint } from '../../../types';
import { formatTokenCount, formatTokens } from '../format';
import { useTranslation } from 'react-i18next';

function sum(
  points: UsagePoint[],
  field: 'tokens' | 'requests' | 'inputTokens' | 'outputTokens',
) {
  return points.reduce((total, point) => total + point[field], 0);
}

function comparison(current: number, previous: number) {
  if (current === 0 && previous === 0) {
    return i18next.t('trend.unchanged', { ns: 'profile' });
  }
  if (previous === 0) {
    return i18next.t('trend.firstData', { ns: 'profile' });
  }
  const change = Math.round(((current - previous) / previous) * 100);
  return i18next.t('trend.comparedToLastWeek', {
    ns: 'profile',
    value: `${change > 0 ? '+' : ''}${change}`,
  });
}

export function ProfileOverview({
  usage,
  chatCount,
  messageCount,
  providerCount,
  galaxyItems,
}: {
  usage: UsagePoint[];
  chatCount: number;
  messageCount: number;
  providerCount: number;
  galaxyItems: GalaxyItem[];
}) {
  const { t } = useTranslation('profile');
  const current = usage.slice(-7);
  const previous = usage.slice(-14, -7);
  const tokens = sum(current, 'tokens');
  const requests = sum(current, 'requests');
  const input = sum(current, 'inputTokens');
  const output = sum(current, 'outputTokens');
  const activeDays = current.filter((point) => point.requests > 0).length;
  const average = requests > 0 ? Math.round(tokens / requests) : 0;
  const outputShare = tokens > 0 ? Math.round((output / tokens) * 100) : 0;
  const personas = galaxyItems.filter((item) => item.kind === 'persona').length;
  const characters = galaxyItems.filter(
    (item) => item.kind === 'character',
  ).length;
  const lore = galaxyItems.length - personas - characters;
  const averageChatLength =
    chatCount > 0 ? Math.round(messageCount / chatCount) : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <MetricGrid
        metrics={[
          {
            label: t('profileOverview.tokensOver7Days'),
            value: formatTokens(tokens),
            note: comparison(tokens, sum(previous, 'tokens')),
          },
          {
            label: t('profileOverview.modelRequests'),
            value: formatNumber(requests),
            note: comparison(requests, sum(previous, 'requests')),
          },
          {
            label: t('profileOverview.averagePerRequest'),
            value: formatTokens(average),
            note: t('profileOverview.responseShare', { value1: outputShare }),
          },
          {
            label: t('profileOverview.activeDays'),
            value: `${activeDays} / 7`,
            note:
              activeDays > 0
                ? t('profileOverview.contextUsage', {
                    value1: formatTokenCount(input),
                  })
                : t('profileOverview.noRequests'),
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Surface className="rounded-2xl border border-separator p-4 sm:p-5">
          <h2 className="section-title">
            {t('profileOverview.libraryAndChats')}
          </h2>
          <p className="section-description">
            {t(
              'profileOverview.howMuchContextIsAlreadyPreparedForConversation',
            )}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            {[
              [t('profileOverview.chats'), chatCount],
              [t('profileOverview.messages'), messageCount],
              [t('profileOverview.personas'), personas],
              [t('profileOverview.characters'), characters],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl bg-surface-secondary px-3 py-3"
              >
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {formatNumber(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
        </Surface>

        <Surface className="rounded-2xl border border-separator p-4 sm:p-5">
          <h2 className="section-title">{t('profileOverview.appReadiness')}</h2>
          <p className="section-description">
            {t('profileOverview.aQuickSummaryOfTheConfiguredEnvironment')}
          </p>
          <div className="mt-4 space-y-3">
            {[
              {
                label: t('profileOverview.connections'),
                value: providerCount,
                detail:
                  providerCount > 0
                    ? t('profileOverview.readyToSendRequests')
                    : t('profileOverview.aProviderMustBeAdded'),
              },
              {
                label: t('profileOverview.loreAndStyles'),
                value: lore,
                detail:
                  lore > 0
                    ? t('profileOverview.readyToConnectToChats')
                    : t('profileOverview.worldContextIsEmpty'),
              },
              {
                label: t('profileOverview.averageChatLength'),
                value: averageChatLength,
                detail: t('count.messagePerChat', {
                  count: averageChatLength,
                }),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-surface-hover px-3 py-3"
              >
                <strong className="min-w-10 text-center text-lg tabular-nums grid place-items-center min-h-10 bg-surface-hover rounded-full">
                  {item.value}
                </strong>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {item.detail}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}
