import { BrandMark } from '@/components/BrandMark';
import { Surface } from '@heroui/react';
import { useTranslation } from 'react-i18next';

export function AppInfo({ version }: { version: string }) {
  const { t } = useTranslation('profile');
  return (
    <Surface className="flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-2xl border border-separator p-4">
      <div className="md:hidden">
        <BrandMark size={38} />
      </div>
      <div className="min-w-0 flex-1">
        <strong className="block text-sm font-semibold">Galactrix</strong>
        <span className="mt-1 block text-xs text-muted">
          {t('appInfo.appVersion')}
        </span>
      </div>
      <span className="text-xs text-muted">
        {version ? `v${version}` : '-'}
      </span>
    </Surface>
  );
}
