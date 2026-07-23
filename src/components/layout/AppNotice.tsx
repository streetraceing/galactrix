import { Button, Surface } from '@heroui/react';
import { Icon } from '../Icon';

export function AppNotice({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  if (!message) return null;
  return (
    <Surface
      variant="tertiary"
      role="status"
      className="absolute right-3 top-3 z-50 flex max-w-[min(28rem,calc(100%-1.5rem))] items-start gap-3 rounded-xl border border-separator p-3 shadow-overlay md:top-4"
    >
      <span className="selectable min-w-0 flex-1 wrap-break-word text-sm">
        {message}
      </span>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label="Закрыть уведомление"
        onPress={onClose}
      >
        <Icon name="close" className="size-4" />
      </Button>
    </Surface>
  );
}
