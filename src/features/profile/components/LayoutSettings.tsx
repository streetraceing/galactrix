import { Button, Surface } from '@heroui/react';

export function LayoutSettings({
  sidebarWidth,
  chatSidebarWidth,
  onReset,
}: {
  sidebarWidth: number;
  chatSidebarWidth: number;
  onReset: () => void;
}) {
  return (
    <Surface
      variant="secondary"
      className="flex flex-col gap-4 rounded-2xl border border-separator p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div>
        <h2 className="section-title">Ширина панелей</h2>
        <p className="section-description">
          Основная {Math.round(sidebarWidth)} px · Чаты{' '}
          {Math.round(chatSidebarWidth)} px
        </p>
      </div>
      <Button size="sm" variant="secondary" onPress={onReset}>
        Сбросить ширину
      </Button>
    </Surface>
  );
}
