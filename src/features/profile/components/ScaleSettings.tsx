import { Button, Surface } from '@heroui/react';

const scales = [0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.5];

export function ScaleSettings({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Surface
      variant="secondary"
      className="rounded-2xl border border-separator p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Масштаб интерфейса</h2>
          <p className="section-description">
            Текущий масштаб: {Math.round(value * 100)}%.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          isDisabled={value === 1}
          onPress={() => onChange(1)}
        >
          Сбросить
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {scales.map((scale) => (
          <Button
            key={scale}
            size="sm"
            variant={value === scale ? 'secondary' : 'ghost'}
            onPress={() => onChange(scale)}
          >
            {Math.round(scale * 100)}%
          </Button>
        ))}
      </div>
    </Surface>
  );
}
