import { MOTION_STAGGER_MS } from '../../lib/motion';
import { AppPanel } from './AppPanel';

export type Metric = {
  label: string;
  value: string | number;
  note?: string;
};

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <AppPanel className="grid grid-cols-2 overflow-hidden md:grid-cols-4">
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={`metric-enter min-w-0 p-5 ${index % 2 === 1 ? 'border-l border-default' : ''} ${index >= 2 ? 'border-t border-default md:border-t-0' : ''} ${index > 0 ? 'md:border-l md:border-default' : ''}`}
          style={{ animationDelay: `${index * MOTION_STAGGER_MS}ms` }}
        >
          <span className="block text-xs font-medium leading-5 text-muted">
            {metric.label}
          </span>
          <strong className="mt-2 block text-xl font-semibold tracking-tight sm:text-2xl">
            {metric.value}
          </strong>
          {metric.note ? (
            <span className="mt-1 block text-xs leading-5 text-muted">
              {metric.note}
            </span>
          ) : null}
        </div>
      ))}
    </AppPanel>
  );
}
