import { Button } from '@heroui/react';
import { BrandMark } from '../BrandMark';
import { AppPanel } from '../ui/AppPanel';
import { useTranslation } from 'react-i18next';

export function AppError({
  message,
  onRetry,
  title,
  retryLabel,
}: {
  message: string;
  onRetry: () => void;
  title?: string;
  retryLabel?: string;
}) {
  const { t } = useTranslation('common');
  return (
    <main className="grid h-full place-items-center bg-background p-6 text-foreground">
      <AppPanel className="motion-empty-enter w-full max-w-md p-7 text-center">
        <div className="mx-auto mb-5 flex justify-center">
          <BrandMark size={58} />
        </div>
        <h1 className="text-xl font-semibold">
          {title ?? t('appError.couldNotOpenData')}
        </h1>
        <p className="selectable mt-2 wrap-break-word text-sm leading-6 text-muted">
          {message}
        </p>
        <Button className="mt-6" variant="primary" onPress={onRetry}>
          {retryLabel ?? t('appError.retry')}
        </Button>
      </AppPanel>
    </main>
  );
}
