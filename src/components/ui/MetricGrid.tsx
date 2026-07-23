import { Surface } from '@heroui/react';

export type Metric = {
  label: string;
  value: string | number;
  note?: string;
};

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <Surface
      className="grid overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-4"
    >
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={`min-w-0 p-4 sm:p-5 ${index > 0 ? 'border-t border-background sm:border-t-0 sm:border-l' : ''} ${index === 2 ? 'sm:border-l-0 lg:border-l' : ''}`}
        >
          <span className="text-xs font-medium text-muted">{metric.label}</span>
          <strong className="mt-2 block text-2xl font-semibold tracking-tight">
            {metric.value}
          </strong>
          {metric.note ? (
            <span className="mt-1 block text-xs text-muted">{metric.note}</span>
          ) : null}
        </div>
      ))}
    </Surface>
  );
}
