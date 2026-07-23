import { Surface } from '@heroui/react';
import { BrandMark } from '../../../components/BrandMark';

export function AppInfo({ version }: { version: string }) {
  return (
    <Surface
      variant="secondary"
      className="flex items-center gap-3 rounded-2xl border border-separator p-4"
    >
      <BrandMark size={38} />
      <div className="min-w-0 flex-1">
        <strong className="block text-sm font-semibold">Galactrix</strong>
        <span className="mt-1 block text-xs text-muted">Версия приложения</span>
      </div>
      <span className="text-xs text-muted">
        {version ? `v${version}` : '—'}
      </span>
    </Surface>
  );
}
