import { Button, ListBox, Select, Surface } from '@heroui/react';
import { useTranslation } from 'react-i18next';

const scales = [0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.5];

export function ScaleSettings({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslation('profile');
  const currentIndex = scales.reduce((closestIndex, scale, index) => {
    const currentDifference = Math.abs(scales[closestIndex] - value);
    const nextDifference = Math.abs(scale - value);

    return nextDifference < currentDifference ? index : closestIndex;
  }, 0);

  const currentScale = scales[currentIndex];

  const decreaseScale = () => {
    const previousScale = scales[currentIndex - 1];

    if (previousScale !== undefined) {
      onChange(previousScale);
    }
  };

  const increaseScale = () => {
    const nextScale = scales[currentIndex + 1];

    if (nextScale !== undefined) {
      onChange(nextScale);
    }
  };

  return (
    <Surface className="h-full rounded-2xl border border-separator p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title">{t('scaleSettings.interfaceScale')}</h2>
          <p className="section-description">
            {t('scaleSettings.currentScale')}
            {Math.round(value * 100)}%.
          </p>
        </div>

        <Button
          size="sm"
          variant="ghost"
          isDisabled={value === 1}
          onPress={() => onChange(1)}
        >
          {t('scaleSettings.reset')}
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          aria-label={t('scaleSettings.decreaseScale')}
          size="sm"
          variant="secondary"
          isIconOnly
          isDisabled={currentIndex === 0}
          onPress={decreaseScale}
        >
          <span aria-hidden="true" className="text-lg text-center">
            −
          </span>
        </Button>

        <Select
          aria-label={t('scaleSettings.interfaceScale')}
          className="min-w-0 flex-1"
          variant="secondary"
          value={String(currentScale)}
          onChange={(selected) => {
            if (selected === null || Array.isArray(selected)) return;

            const nextValue = Number(selected);

            if (Number.isFinite(nextValue)) {
              onChange(nextValue);
            }
          }}
        >
          <Select.Trigger className="w-full">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>

          <Select.Popover>
            <ListBox>
              {scales.map((scale) => {
                const label = `${Math.round(scale * 100)}%`;

                return (
                  <ListBox.Item
                    key={scale}
                    id={String(scale)}
                    className="hover:bg-accent-soft"
                    textValue={label}
                  >
                    {label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                );
              })}
            </ListBox>
          </Select.Popover>
        </Select>

        <Button
          aria-label={t('scaleSettings.increaseScale')}
          size="sm"
          variant="secondary"
          isIconOnly
          isDisabled={currentIndex === scales.length - 1}
          onPress={increaseScale}
        >
          <span aria-hidden="true" className="text-lg text-center">
            +
          </span>
        </Button>
      </div>
    </Surface>
  );
}
