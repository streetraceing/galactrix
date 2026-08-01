import { Button, Chip, Surface } from '@heroui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { TooltipIconButton } from '../../../components/ui/TooltipIconButton';
import { formatDate, formatNumber } from '../../../i18n';
import type { UsagePoint } from '../../../types';
import { formatTokens } from '../format';
import { useTranslation } from 'react-i18next';

type UsageMetric = 'tokens' | 'requests';

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

function valueFor(point: UsagePoint, metric: UsageMetric) {
  return metric === 'tokens' ? point.tokens : point.requests;
}

function formattedValue(value: number, metric: UsageMetric) {
  return metric === 'tokens' ? formatTokens(value) : formatNumber(value);
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
  const [selectedDay, setSelectedDay] = useState(() => latestUsage?.day ?? 0);
  const selected =
    usage.find((point) => point.day === selectedDay) ?? latestUsage;
  const maxValue = usage.reduce(
    (maximum, point) => Math.max(maximum, valueFor(point, metric)),
    1,
  );
  const total = useMemo(
    () => usage.reduce((sum, point) => sum + valueFor(point, metric), 0),
    [metric, usage],
  );

  useEffect(() => {
    const latest = usage[usage.length - 1];
    if (!latest) return;

    setSelectedDay((current: number) =>
      usage.some((point) => point.day === current) ? current : latest.day,
    );

    const frame = requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({
        left: scrollerRef.current.scrollWidth,
        behavior: 'auto',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [usage]);

  const scrollPeriod = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.82, 280),
      behavior: 'smooth',
    });
  };

  const goToLatest = () => {
    const latest = usage[usage.length - 1];
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

  const average =
    selected.requests > 0 ? Math.round(selected.tokens / selected.requests) : 0;

  return (
    <Surface className="overflow-hidden rounded-2xl border border-separator bg-surface shadow-surface ring-1 ring-inset ring-foreground/5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-separator p-4 sm:p-5">
        <div key={`${metric}-${selected.day}`} className="metric-enter">
          <p className="text-sm capitalize text-muted">
            {fullDate(selected.day)}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {formattedValue(valueFor(selected, metric), metric)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {metric === 'tokens'
              ? t('count.tokensUsed', { count: selected.tokens })
              : t('count.requestsSent', { count: selected.requests })}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <TooltipIconButton
            label={t('usageTimeline.showPreviousPeriod')}
            size="sm"
            variant="ghost"
            onPress={() => scrollPeriod(-1)}
          >
            <Icon name="chevron-left" className="size-4" />
          </TooltipIconButton>
          <Button size="sm" variant="secondary" onPress={goToLatest}>
            {t('usageTimeline.today')}
          </Button>
          <TooltipIconButton
            label={t('usageTimeline.showNextPeriod')}
            size="sm"
            variant="ghost"
            onPress={() => scrollPeriod(1)}
          >
            <Icon name="chevron-right" className="size-4" />
          </TooltipIconButton>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-thin usage-timeline h-64 overflow-x-auto px-3 pb-3 pt-6 sm:h-72 sm:px-5"
        aria-label={
          metric === 'tokens'
            ? t('usageTimeline.dailyTokenUsage')
            : t('usageTimeline.dailyRequestCount')
        }
      >
        <div
          className="grid h-full min-w-full snap-x snap-mandatory items-end gap-1"
          style={{
            gridTemplateColumns: `repeat(${usage.length}, minmax(2.75rem, 1fr))`,
          }}
        >
          {usage.map((point, index) => {
            const value = valueFor(point, metric);
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
              {`${t('usageTimeline.average')} ${formatTokens(average)} ${t('usageTimeline.request')}`}
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
              {`${t('usageTimeline.periodTotal')} ${t('count.request', { count: total })}`}
            </Chip>
          </>
        )}
      </div>
    </Surface>
  );
}
