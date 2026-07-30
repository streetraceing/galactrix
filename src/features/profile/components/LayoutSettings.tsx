import { Button, Surface } from '@heroui/react';
import { useTranslation } from 'react-i18next';

export function LayoutSettings({
  sidebarWidth,
  chatSidebarWidth,
  onReset,
}: {
  sidebarWidth: number;
  chatSidebarWidth: number;
  onReset: () => void;
}) {
  const { t } = useTranslation('profile');
  return (
    <Surface className="h-full flex-col rounded-2xl border border-separator p-4 sm:p-5 hidden sm:flex">
      <div>
        <h2 className="section-title">{t('layoutSettings.panelWidths')}</h2>
        <p className="section-description">
          {t('layoutSettings.main')} {Math.round(sidebarWidth)} px ·{' '}
          {t('layoutSettings.pxChats')} {Math.round(chatSidebarWidth)} px
        </p>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="mt-5 self-start md:mt-auto"
        onPress={onReset}
      >
        {t('layoutSettings.resetWidths')}
      </Button>
    </Surface>
  );
}
