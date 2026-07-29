import { Button, Chip, Surface } from '@heroui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../../components/Icon';
import type { UsagePoint } from '../../../types';
import { formatTokens } from '../format';

type UsageMetric = 'tokens' | 'requests';

function fullDate(day: number) {
  return new Date(day * 86_400_000).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function shortDate(day: number) {
  return new Date(day * 86_400_000).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });
}

function valueFor(point: UsagePoint, metric: UsageMetric) {
  return metric === 'tokens' ? point.tokens : point.requests;
}

function formattedValue(value: number, metric: UsageMetric) {
  return metric === 'tokens'
    ? formatTokens(value)
    : value.toLocaleString('ru-RU');
}

export function UsageTimeline({
  usage,
  metric,
}: {
  usage: UsagePoint[];
  metric: UsageMetric;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState(() => usage.at(-1)?.day ?? 0);
  const selected =
    usage.find((point) => point.day === selectedDay) ?? usage.at(-1);
  const maxValue = usage.reduce(
    (maximum, point) => Math.max(maximum, valueFor(point, metric)),
    1,
  );
  const total = useMemo(
    () => usage.reduce((sum, point) => sum + valueFor(point, metric), 0),
    [metric, usage],
  );

  useEffect(() => {
    const latest = usage.at(-1);
    if (!latest) return;

    setSelectedDay((current) =>
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
    const latest = usage.at(-1);
    if (latest) setSelectedDay(latest.day);
    scrollerRef.current?.scrollTo({
      left: scrollerRef.current.scrollWidth,
      behavior: 'smooth',
    });
  };

  if (!selected) {
    return (
      <Surface className="grid min-h-64 place-items-center rounded-2xl border border-separator p-6 text-center text-muted">
        Статистика появится после первого запроса к модели.
      </Surface>
    );
  }

  const average =
    selected.requests > 0 ? Math.round(selected.tokens / selected.requests) : 0;

  return (
    <Surface className="overflow-hidden rounded-2xl border border-separator">
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
              ? 'токенов использовано'
              : 'запросов отправлено'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Показать предыдущий период"
            onPress={() => scrollPeriod(-1)}
          >
            <Icon name="chevron-left" className="size-4" />
          </Button>
          <Button size="sm" variant="secondary" onPress={goToLatest}>
            Сегодня
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Показать следующий период"
            onPress={() => scrollPeriod(1)}
          >
            <Icon name="chevron-right" className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-thin usage-timeline flex h-64 snap-x snap-mandatory items-end gap-1 overflow-x-auto px-3 pb-3 pt-6 sm:h-72 sm:px-5"
        aria-label={
          metric === 'tokens'
            ? 'Использование токенов по дням'
            : 'Количество запросов по дням'
        }
      >
        {usage.map((point, index) => {
          const value = valueFor(point, metric);
          const height = value > 0 ? Math.max((value / maxValue) * 100, 3) : 0;
          const inputHeight =
            point.tokens > 0 ? (point.inputTokens / point.tokens) * height : 0;
          const outputHeight = Math.max(height - inputHeight, 0);
          const isSelected = point.day === selected.day;
          const isWeekStart = index % 7 === 0;

          return (
            <button
              type="button"
              key={point.day}
              className="group flex h-full w-12 shrink-0 snap-start flex-col items-center gap-2 rounded-xl px-1 outline-none transition-[background-color,transform] duration-200 hover:bg-default/50 active:scale-95 focus-visible:ring-2 focus-visible:ring-focus"
              aria-label={`${fullDate(point.day)}: ${formattedValue(value, metric)}`}
              aria-pressed={isSelected}
              onClick={() => setSelectedDay(point.day)}
            >
              <span
                className={`min-h-4 text-[0.62rem] tabular-nums transition-colors ${
                  isSelected ? 'font-semibold text-accent' : 'text-muted'
                }`}
              >
                {value > 0 ? formattedValue(value, metric) : '—'}
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
                {point.label}
              </span>
              <span
                className={`text-[0.6rem] tabular-nums ${
                  isWeekStart || isSelected ? 'text-muted' : 'text-transparent'
                }`}
              >
                {shortDate(point.day)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 border-t border-separator p-4 sm:grid-cols-3 sm:p-5">
        {metric === 'tokens' ? (
          <>
            <Chip variant="soft" className="justify-center">
              <span className="size-2 rounded-full bg-accent" />
              Контекст {formatTokens(selected.inputTokens)}
            </Chip>
            <Chip variant="soft" className="justify-center">
              <span className="size-2 rounded-full bg-success" />
              Ответы {formatTokens(selected.outputTokens)}
            </Chip>
            <Chip variant="soft" className="justify-center">
              В среднем {formatTokens(average)} / запрос
            </Chip>
          </>
        ) : (
          <>
            <Chip variant="soft" className="justify-center">
              За день {selected.requests.toLocaleString('ru-RU')}
            </Chip>
            <Chip variant="soft" className="justify-center">
              Токенов {formatTokens(selected.tokens)}
            </Chip>
            <Chip variant="soft" className="justify-center">
              Всего за период {total.toLocaleString('ru-RU')}
            </Chip>
          </>
        )}
      </div>
    </Surface>
  );
}
