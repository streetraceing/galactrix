import { Button, Chip, Surface } from '@heroui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { TooltipIconButton } from '../../../components/ui/TooltipIconButton';
import { formatDate, formatNumber } from '../../../i18n';
import type { UsagePoint } from '../../../types';
import { formatTokens } from '../format';
import {
  usageForRange,
  usageSummary,
  usageValue,
  type UsageMetric,
  type UsageRange,
} from '../usageStats';
import { useTranslation } from 'react-i18next';

function fullDate(day: number) {
  return formatDate(day * 86_400_000, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function shortDate(day: number) {
  return formatDate(day * 86_400_000, {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });
}

function weekday(day: number) {
  return formatDate(day * 86_400_000, {
    weekday: 'short',
    timeZone: 'UTC',
  });
}

function formattedValue(value: number, metric: UsageMetric) {
  return metric === 'tokens'
    ? formatTokens(value)
    : formatNumber(Math.round(value));
}

export function UsageTimeline({
  usage,
  metric,
}: {
  usage: UsagePoint[];
  metric: UsageMetric;
}) {
  const { t } = useTranslation('profile');
  const scrollerRef = useRef<HTMLDivElement>(null);
  const latestUsage = usage[usage.length - 1];
  const [range, setRange] = useState<UsageRange>('week');
  const displayedUsage = useMemo(
    () => usageForRange(usage, range),
    [range, usage],
  );
  const [selectedDay, setSelectedDay] = useState(() => latestUsage?.day ?? 0);
  const selected =
    displayedUsage.find((point) => point.day === selectedDay) ??
    displayedUsage[displayedUsage.length - 1];
  const summary = useMemo(
    () => usageSummary(displayedUsage, metric),
    [displayedUsage, metric],
  );
  const maxValue = displayedUsage.reduce(
    (maximum, point) => Math.max(maximum, usageValue(point, metric)),
    1,
  );

  useEffect(() => {
    const latest = displayedUsage[displayedUsage.length - 1];
    if (!latest) return;

    setSelectedDay((current: number) =>
      displayedUsage.some((point) => point.day === current)
        ? current
        : latest.day,
    );

    const frame = requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({
        left: scrollerRef.current.scrollWidth,
        behavior: 'auto',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [displayedUsage]);

  const selectAdjacentDay = (direction: -1 | 1) => {
    if (!selected) return;
    const index = displayedUsage.findIndex(
      (point) => point.day === selected.day,
    );
    const next = displayedUsage[index + direction];
    if (!next) return;
    setSelectedDay(next.day);
    scrollerRef.current
      ?.querySelector<HTMLElement>(`[data-usage-day="${next.day}"]`)
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
  };

  const goToLatest = () => {
    const latest = displayedUsage[displayedUsage.length - 1];
    if (latest) setSelectedDay(latest.day);
    scrollerRef.current?.scrollTo({
      left: scrollerRef.current.scrollWidth,
      behavior: 'smooth',
    });
  };

  if (!selected) {
    return (
      <Surface className="grid min-h-64 place-items-center rounded-2xl border border-separator bg-surface p-6 text-center text-muted shadow-surface ring-1 ring-inset ring-foreground/5">
        {t('usageTimeline.statisticsWillAppearAfterTheFirstModelRequest')}
      </Surface>
    );
  }

  const selectedAverage =
    selected.requests > 0 ? Math.round(selected.tokens / selected.requests) : 0;
  const selectedIndex = displayedUsage.findIndex(
    (point) => point.day === selected.day,
  );
  const peakValue = summary.peak ? usageValue(summary.peak, metric) : 0;

  return (
    <Surface className="overflow-hidden rounded-2xl border border-separator bg-surface shadow-surface ring-1 ring-inset ring-foreground/5">
      <div className="border-b border-separator p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1 rounded-xl">
            {(['week', 'month', 'all'] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={range === value ? 'secondary' : 'tertiary'}
                className="min-w-0 px-3"
                onPress={() => setRange(value)}
              >
                {t(`usageTimeline.range.${value}`)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted">
            {t('usageTimeline.daysShown', { count: displayedUsage.length })}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div
            key={`${metric}-${selected.day}`}
            className="metric-enter min-w-0"
          >
            <p className="text-sm capitalize text-muted">
              {fullDate(selected.day)}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {formattedValue(usageValue(selected, metric), metric)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {metric === 'tokens'
                ? t('count.tokensUsed', { count: selected.tokens })
                : t('count.requestsSent', { count: selected.requests })}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <TooltipIconButton
              label={t('usageTimeline.previousDay')}
              size="sm"
              variant="tertiary"
              isDisabled={selectedIndex <= 0}
              onPress={() => selectAdjacentDay(-1)}
            >
              <Icon name="chevron-left" className="size-4" />
            </TooltipIconButton>
            <Button size="sm" variant="tertiary" onPress={goToLatest}>
              {t('usageTimeline.today')}
            </Button>
            <TooltipIconButton
              label={t('usageTimeline.nextDay')}
              size="sm"
              variant="tertiary"
              isDisabled={selectedIndex >= displayedUsage.length - 1}
              onPress={() => selectAdjacentDay(1)}
            >
              <Icon name="chevron-right" className="size-4" />
            </TooltipIconButton>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatSummary
            label={t('usageTimeline.periodTotal')}
            value={formattedValue(summary.total, metric)}
          />
          <StatSummary
            label={t('usageTimeline.averagePerDay')}
            value={formattedValue(summary.average, metric)}
          />
          <StatSummary
            label={t('usageTimeline.peak')}
            value={formattedValue(peakValue, metric)}
            hint={summary.peak ? shortDate(summary.peak.day) : undefined}
          />
          <StatSummary
            label={t('usageTimeline.activeDays')}
            value={`${summary.activeDays}/${displayedUsage.length}`}
          />
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-thin usage-timeline h-64 overflow-x-auto px-3 pb-4 pt-6 sm:h-72 sm:px-5 sm:pb-5"
        aria-label={
          metric === 'tokens'
            ? t('usageTimeline.dailyTokenUsage')
            : t('usageTimeline.dailyRequestCount')
        }
      >
        <div
          className="grid h-full min-w-full snap-x snap-mandatory items-end gap-1"
          style={{
            gridTemplateColumns: `repeat(${displayedUsage.length}, minmax(2.75rem, 1fr))`,
          }}
        >
          {displayedUsage.map((point, index) => {
            const value = usageValue(point, metric);
            const height =
              value > 0 ? Math.max((value / maxValue) * 100, 3) : 0;
            const inputHeight =
              point.tokens > 0
                ? (point.inputTokens / point.tokens) * height
                : 0;
            const outputHeight = Math.max(height - inputHeight, 0);
            const isSelected = point.day === selected.day;
            const isWeekStart = index % 7 === 0;

            return (
              <button
                type="button"
                key={point.day}
                data-usage-day={point.day}
                className="group flex h-full min-w-11 snap-start flex-col items-center gap-2 rounded-xl px-1 outline-none transition-[background-color,transform] duration-200 hover:bg-default/50 active:scale-95 focus-visible:ring-2 focus-visible:ring-focus"
                aria-label={`${fullDate(point.day)}: ${formattedValue(value, metric)}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedDay(point.day)}
              >
                <span
                  className={`min-h-4 text-[0.62rem] tabular-nums transition-colors ${
                    isSelected ? 'font-semibold text-accent' : 'text-muted'
                  }`}
                >
                  {value > 0 ? formattedValue(value, metric) : '-'}
                </span>
                <span className="relative min-h-0 w-7 flex-1 overflow-hidden rounded-lg bg-default/60">
                  {metric === 'tokens' ? (
                    <span
                      className={`usage-bar absolute inset-x-0 bottom-0 rounded-lg transition-[height,filter,opacity] duration-500 ${
                        isSelected
                          ? 'bg-accent opacity-100'
                          : 'bg-accent/65 opacity-80 group-hover:opacity-100'
                      }`}
                      style={{ height: `${inputHeight}%` }}
                    >
                      <span
                        className={`absolute inset-x-0 top-0 rounded-t-lg transition-[height] duration-500 ${
                          isSelected ? 'bg-success' : 'bg-success/70'
                        }`}
                        style={{
                          height:
                            height > 0
                              ? `${Math.min((outputHeight / height) * 100, 100)}%`
                              : '0%',
                        }}
                      />
                    </span>
                  ) : (
                    <span
                      className={`usage-bar absolute inset-x-0 bottom-0 rounded-lg transition-[height,filter,opacity] duration-500 ${
                        isSelected
                          ? 'bg-accent opacity-100'
                          : 'bg-accent/65 opacity-80 group-hover:opacity-100'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  )}
                </span>
                <span
                  className={`text-xs font-medium transition-colors ${
                    isSelected ? 'text-accent' : 'text-foreground'
                  }`}
                >
                  {weekday(point.day)}
                </span>
                <span
                  className={`text-[0.6rem] tabular-nums ${
                    isWeekStart || isSelected
                      ? 'text-muted'
                      : 'text-transparent'
                  }`}
                >
                  {shortDate(point.day)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-separator p-4 sm:flex-row sm:gap-3 sm:p-5">
        {metric === 'tokens' ? (
          <>
            <Chip
              variant="soft"
              className="w-full justify-center gap-1 sm:flex-1"
            >
              <span className="size-2 rounded-full bg-accent" />
              {`${t('usageTimeline.context')} ${formatTokens(selected.inputTokens)}`}
            </Chip>
            <Chip
              variant="soft"
              className="w-full justify-center gap-1 sm:flex-1"
            >
              <span className="size-2 rounded-full bg-success" />
              {`${t('usageTimeline.responses')} ${formatTokens(selected.outputTokens)}`}
            </Chip>
            <Chip variant="soft" className="w-full justify-center sm:flex-1">
              {`${t('usageTimeline.average')} ${formatTokens(selectedAverage)} ${t('usageTimeline.request')}`}
            </Chip>
          </>
        ) : (
          <>
            <Chip variant="soft" className="w-full justify-center sm:flex-1">
              {`${t('usageTimeline.perDay')} ${t('count.request', { count: selected.requests })}`}
            </Chip>
            <Chip variant="soft" className="w-full justify-center sm:flex-1">
              {`${t('usageTimeline.tokens')} ${formatTokens(selected.tokens)}`}
            </Chip>
            <Chip variant="soft" className="w-full justify-center sm:flex-1">
              {`${t('usageTimeline.periodTotal')} ${t('count.request', { count: summary.total })}`}
            </Chip>
          </>
        )}
      </div>
    </Surface>
  );
}

function StatSummary({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-default/45 px-3 py-2.5">
      <p className="truncate text-[0.68rem] font-medium text-muted">{label}</p>
      <div className="mt-1 flex min-w-0 items-baseline gap-1.5">
        <p className="truncate text-base font-semibold tabular-nums">{value}</p>
        {hint ? (
          <span className="shrink-0 text-[0.65rem] text-muted">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
