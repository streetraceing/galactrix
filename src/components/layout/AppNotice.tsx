import { Surface } from '@heroui/react';
import { Icon } from '../Icon';
import { TooltipIconButton } from '../ui/TooltipIconButton';
import { useTranslation } from 'react-i18next';

export function AppNotice({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('common');
  if (!message) return null;
  return (
    <Surface
      variant="transparent"
      role="status"
      className="motion-notice-enter ui-overlay-surface absolute right-3 top-3 z-50 flex max-w-[min(28rem,calc(100%-1.5rem))] items-start gap-3 p-3 md:top-4"
    >
      <span className="selectable min-w-0 flex-1 wrap-break-word text-sm">
        {message}
      </span>
      <TooltipIconButton
        label={t('appNotice.dismissNotification')}
        size="sm"
        variant="ghost"
        onPress={onClose}
      >
        <Icon name="close" className="size-4" />
      </TooltipIconButton>
    </Surface>
  );
}
