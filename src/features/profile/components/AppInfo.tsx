import { BrandMark } from '@/components/BrandMark';
import { Surface } from '@heroui/react';

export function AppInfo({ version }: { version: string }) {
  return (
    <Surface className="flex items-center gap-3 rounded-2xl border border-separator p-4">
      <div>
        <BrandMark size={38} />
      </div>
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
