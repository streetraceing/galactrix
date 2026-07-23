import { Surface } from '@heroui/react';

export type Metric = {
  label: string;
  value: string | number;
  note?: string;
};

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <Surface className="grid grid-cols-2 overflow-hidden rounded-2xl border border-separator md:grid-cols-4">
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={`min-w-0 p-4 sm:p-5 ${index % 2 === 1 ? 'border-l border-separator' : ''} ${index >= 2 ? 'border-t border-separator md:border-t-0' : ''} ${index > 0 ? 'md:border-l md:border-separator' : ''}`}
        >
          <span className="block truncate text-xs font-medium text-muted">
            {metric.label}
          </span>
          <strong className="mt-2 block text-xl font-semibold tracking-tight sm:text-2xl">
            {metric.value}
          </strong>
          {metric.note ? (
            <span className="mt-1 block truncate text-xs text-muted">
              {metric.note}
            </span>
          ) : null}
        </div>
      ))}
    </Surface>
  );
}
