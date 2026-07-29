import { Chip, Surface } from '@heroui/react';
import type { UsagePoint } from '../../../types';
import { formatTokens } from '../format';

function dateLabel(day: number) {
  return new Date(day * 86_400_000).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function UsageChart({ usage }: { usage: UsagePoint[] }) {
  const current = usage.slice(-7);
  const maxTokens = Math.max(...current.map((point) => point.tokens), 1);
  const totalInput = current.reduce((sum, point) => sum + point.inputTokens, 0);
  const totalOutput = current.reduce(
    (sum, point) => sum + point.outputTokens,
    0,
  );
  const totalRequests = current.reduce((sum, point) => sum + point.requests, 0);
  const hasUsage = totalInput + totalOutput + totalRequests > 0;

  return (
    <Surface className="overflow-hidden rounded-2xl border border-separator">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-separator p-4 sm:p-5">
        <div>
          <h2 className="section-title">Активность за 7 дней</h2>
          <p className="section-description">
            Реальное соотношение контекста и ответов моделей.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip size="sm" variant="soft">
            <span className="size-2 rounded-full bg-accent" />
            Входящие {formatTokens(totalInput)}
          </Chip>
          <Chip size="sm" variant="soft">
            <span className="size-2 rounded-full bg-success" />
            Ответы {formatTokens(totalOutput)}
          </Chip>
        </div>
      </div>

      {!hasUsage ? (
        <div className="grid min-h-56 place-items-center px-5 py-10 text-center">
          <div className="max-w-sm">
            <p className="font-medium">Данных пока нет</p>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              После первых запросов здесь появятся токены, количество обращений
              и сравнение активности по дням.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className="grid h-60 grid-cols-7 gap-2 px-3 pb-4 pt-6 sm:h-72 sm:gap-3 sm:px-5"
            aria-label="Использование токенов по дням"
          >
            {current.map((point, index) => {
              const inputHeight = (point.inputTokens / maxTokens) * 100;
              const outputHeight = (point.outputTokens / maxTokens) * 100;
              return (
                <div
                  key={point.day}
                  className="flex min-w-0 flex-col items-center gap-2"
                  title={`${dateLabel(point.day)}: ${point.inputTokens} входящих, ${point.outputTokens} исходящих токенов, ${point.requests} запросов`}
                >
                  <span className="text-[0.65rem] tabular-nums text-muted">
                    {formatTokens(point.tokens)}
                  </span>
                  <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl bg-default/60">
                    <div
                      className="usage-bar absolute inset-x-1 bottom-1 rounded-md bg-accent"
                      style={{
                        height: `${inputHeight}%`,
                        animationDelay: `${index * 55}ms`,
                      }}
                    />
                    <div
                      className="usage-bar absolute inset-x-1 rounded-md bg-success"
                      style={{
                        bottom: `calc(${inputHeight}% + 0.25rem)`,
                        height: `${outputHeight}%`,
                        animationDelay: `${index * 55 + 35}ms`,
                      }}
                    />
                  </div>
                  <strong className="text-xs font-medium">{point.label}</strong>
                  <span className="text-[0.65rem] tabular-nums text-muted">
                    {point.requests} запр.
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-separator">
            <div className="grid grid-cols-[minmax(4.5rem,1fr)_repeat(3,minmax(4rem,1fr))] gap-2 px-4 py-2 text-[0.65rem] font-medium uppercase tracking-wide text-muted sm:px-5">
              <span>День</span>
              <span className="text-right">Контекст</span>
              <span className="text-right">Ответы</span>
              <span className="text-right">Запросы</span>
            </div>
            {current
              .slice()
              .reverse()
              .map((point) => (
                <div
                  key={point.day}
                  className="grid grid-cols-[minmax(4.5rem,1fr)_repeat(3,minmax(4rem,1fr))] gap-2 border-t border-separator px-4 py-2.5 text-xs sm:px-5"
                >
                  <strong className="font-medium">
                    {point.label}, {dateLabel(point.day)}
                  </strong>
                  <span className="text-right tabular-nums text-muted">
                    {formatTokens(point.inputTokens)}
                  </span>
                  <span className="text-right tabular-nums text-muted">
                    {formatTokens(point.outputTokens)}
                  </span>
                  <span className="text-right tabular-nums text-muted">
                    {point.requests.toLocaleString('ru-RU')}
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
    </Surface>
  );
}
