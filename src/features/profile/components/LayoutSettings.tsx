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
    <Surface className="h-full flex-col rounded-2xl border border-separator p-4 sm:p-5 hidden sm:flex">
      <div>
        <h2 className="section-title">Ширина панелей</h2>
        <p className="section-description">
          Основная {Math.round(sidebarWidth)} px · Чаты{' '}
          {Math.round(chatSidebarWidth)} px
        </p>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="mt-5 self-start md:mt-auto"
        onPress={onReset}
      >
        Сбросить ширину
      </Button>
    </Surface>
  );
}
