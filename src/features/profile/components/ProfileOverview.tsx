import { Surface } from '@heroui/react';
import { MetricGrid } from '../../../components/ui/MetricGrid';
import type { GalaxyItem, UsagePoint } from '../../../types';
import { formatTokens } from '../format';
import { UsageChart } from './UsageChart';

function sum(
  points: UsagePoint[],
  field: 'tokens' | 'requests' | 'inputTokens' | 'outputTokens',
) {
  return points.reduce((total, point) => total + point[field], 0);
}

function comparison(current: number, previous: number) {
  if (current === 0 && previous === 0) return 'без изменений';
  if (previous === 0) return 'первые данные за период';
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? '+' : ''}${change}% к прошлой неделе`;
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

  return (
    <div className="space-y-5 sm:space-y-6">
      <MetricGrid
        metrics={[
          {
            label: 'Токены за 7 дней',
            value: formatTokens(tokens),
            note: comparison(tokens, sum(previous, 'tokens')),
          },
          {
            label: 'Запросы к моделям',
            value: requests.toLocaleString('ru-RU'),
            note: comparison(requests, sum(previous, 'requests')),
          },
          {
            label: 'Среднее на запрос',
            value: formatTokens(average),
            note: `${outputShare}% приходится на ответы`,
          },
          {
            label: 'Активные дни',
            value: `${activeDays} / 7`,
            note:
              activeDays > 0
                ? `${formatTokens(input)} токенов контекста`
                : 'нет запросов',
          },
        ]}
      />

      <UsageChart usage={usage} />

      <div className="grid gap-4 md:grid-cols-2">
        <Surface className="rounded-2xl border border-separator p-4 sm:p-5">
          <h2 className="section-title">Библиотека и диалоги</h2>
          <p className="section-description">
            Сколько контекста уже подготовлено для общения.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            {[
              ['Чаты', chatCount],
              ['Сообщения', messageCount],
              ['Персоны', personas],
              ['Персонажи', characters],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl bg-surface-secondary px-3 py-3"
              >
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {Number(value).toLocaleString('ru-RU')}
                </dd>
              </div>
            ))}
          </dl>
        </Surface>

        <Surface className="rounded-2xl border border-separator p-4 sm:p-5">
          <h2 className="section-title">Готовность приложения</h2>
          <p className="section-description">
            Быстрый срез настроенного окружения.
          </p>
          <div className="mt-4 space-y-3">
            {[
              {
                label: 'Подключения',
                value: providerCount,
                detail:
                  providerCount > 0
                    ? 'можно отправлять запросы'
                    : 'нужно добавить провайдера',
              },
              {
                label: 'Лор и стили',
                value: lore,
                detail:
                  lore > 0
                    ? 'готовы к подключению к чатам'
                    : 'контекст мира пока пуст',
              },
              {
                label: 'Средняя длина чата',
                value: chatCount > 0 ? Math.round(messageCount / chatCount) : 0,
                detail: 'сообщений на диалог',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-separator px-3 py-3"
              >
                <strong className="min-w-10 text-center text-lg tabular-nums">
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
