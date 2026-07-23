import { Surface } from '@heroui/react';
import type { UsagePoint } from '../../../types';
import { formatTokens } from '../format';

export function UsageChart({ usage }: { usage: UsagePoint[] }) {
  const maxTokens = Math.max(...usage.map((point) => point.tokens), 1);
  const totalTokens = usage.reduce((sum, point) => sum + point.tokens, 0);
  const totalRequests = usage.reduce((sum, point) => sum + point.requests, 0);

  return (
    <Surface className="rounded-2xl border border-separator p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Использование за 7 дней</h2>
          <p className="section-description">Токены и запросы по дням.</p>
        </div>
        <span className="text-xs text-muted">
          {formatTokens(totalTokens)} токенов · {totalRequests} запросов
        </span>
      </div>

      {totalTokens === 0 && totalRequests === 0 ? (
        <div className="mt-5 flex min-h-32 items-center justify-center rounded-xl border border-dashed border-separator px-4 text-center">
          <p className="max-w-sm text-sm leading-6 text-muted">
            Статистика появится после первых запросов к моделям.
          </p>
        </div>
      ) : (
        <div
          className="mt-6 grid h-44 grid-cols-7 gap-2 sm:h-52 sm:gap-3"
          aria-label="Токены по дням"
        >
          {usage.map((point) => (
            <div
              key={point.label}
              className="flex min-w-0 flex-col items-center gap-2"
            >
              <span className="text-[0.65rem] text-muted">
                {formatTokens(point.tokens)}
              </span>
              <div className="flex min-h-0 w-full flex-1 items-end overflow-hidden rounded-xl bg-default/60 p-1">
                <div
                  className="w-full rounded-lg bg-accent transition-[height]"
                  style={{
                    height: `${point.tokens === 0 ? 0 : Math.max(5, (point.tokens / maxTokens) * 100)}%`,
                  }}
                />
              </div>
              <strong className="text-xs font-medium">{point.label}</strong>
              <span className="text-[0.65rem] text-muted">
                {point.requests}
              </span>
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}
