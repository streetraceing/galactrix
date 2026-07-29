import { Button, Surface } from '@heroui/react';
import { BrandMark } from '../BrandMark';
import { useTranslation } from 'react-i18next';

export function AppError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation('common');
  return (
    <main className="grid h-full place-items-center bg-background p-6 text-foreground">
      <Surface className="w-full max-w-md rounded-2xl border border-separator p-7 text-center">
        <div className="mx-auto mb-5 flex justify-center">
          <BrandMark size={58} />
        </div>
        <h1 className="text-xl font-semibold">
          {t('appError.couldNotOpenData')}
        </h1>
        <p className="selectable mt-2 wrap-break-word text-sm leading-6 text-muted">
          {message}
        </p>
        <Button className="mt-6" variant="primary" onPress={onRetry}>
          {t('appError.retry')}
        </Button>
      </Surface>
    </main>
  );
}
