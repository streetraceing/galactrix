import { Button } from '@heroui/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPanel } from '../../../components/ui/AppPanel';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { UiModal } from '../../../components/ui/UiModal';
import type { Chat, Message } from '../../../types';
import { buildChatStats } from '../chatStats';

export function ChatStatsModal({
  chat,
  messages,
  onClose,
}: {
  chat: Chat | null;
  messages: Message[];
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('chats');
  const stats = useMemo(() => buildChatStats(messages), [messages]);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.resolvedLanguage ?? undefined, {
        dateStyle: 'medium',
      }),
    [i18n.resolvedLanguage],
  );

  const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);
  const span =
    stats.firstMessageAt != null && stats.lastMessageAt != null
      ? `${dateFormatter.format(new Date(stats.firstMessageAt * 1_000))} — ${dateFormatter.format(new Date(stats.lastMessageAt * 1_000))}`
      : null;

  return (
    <UiModal
      isOpen={chat != null}
      onOpenChange={(open) => !open && onClose()}
      title={t('chatStats.title')}
      description={span ? `${chat?.title ?? ''} · ${span}` : chat?.title}
      size="lg"
      footer={
        <Button variant="ghost" onPress={onClose}>
          {t('chatStats.close')}
        </Button>
      }
    >
      <div className="space-y-4">
        <AppPanel emphasis="subtle" className="p-4">
          <SectionHeader title={t('chatStats.messagesTitle')} />
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted">{t('chatStats.total')}</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {numberFormatter.format(stats.total)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('chatStats.yours')}</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {numberFormatter.format(stats.userCount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('chatStats.assistant')}</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {numberFormatter.format(stats.assistantCount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('chatStats.latency')}</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {stats.avgLatencyMs != null
                  ? t('chatStats.latencyMs', {
                      value: numberFormatter.format(stats.avgLatencyMs),
                    })
                  : t('chatStats.valueUnknown')}
              </dd>
            </div>
          </dl>
        </AppPanel>

        <AppPanel emphasis="subtle" className="p-4">
          <SectionHeader title={t('chatStats.tokensTitle')} />
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">
                {t('chatStats.reportedIn')}
              </dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {numberFormatter.format(stats.reportedInputTokens)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">
                {t('chatStats.reportedOut')}
              </dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {numberFormatter.format(stats.reportedOutputTokens)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('chatStats.estimated')}</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                ~{numberFormatter.format(stats.estimatedTokens)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs leading-5 text-muted">
            {t('chatStats.tokensHint')}
          </p>
        </AppPanel>

        {stats.activeDays.length > 0 ? (
          <AppPanel emphasis="subtle" className="p-4">
            <SectionHeader title={t('chatStats.activityTitle')} />
            <ul className="mt-3 space-y-1.5">
              {stats.activeDays.slice(0, 5).map((entry) => (
                <li
                  key={entry.dayKey}
                  className="flex items-center justify-between gap-3 rounded-xl bg-background/55 px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    {dateFormatter.format(new Date(`${entry.dayKey}T12:00:00`))}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {numberFormatter.format(entry.count)}
                  </span>
                </li>
              ))}
            </ul>
          </AppPanel>
        ) : null}
      </div>
    </UiModal>
  );
}
