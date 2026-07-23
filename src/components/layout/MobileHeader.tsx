import { BrandMark } from '../BrandMark';

export function MobileHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-separator bg-surface px-4 md:hidden">
      <BrandMark size={32} />
      <div className="min-w-0 leading-tight">
        <strong className="block truncate text-sm font-semibold">
          Galactrix
        </strong>
        <span className="mt-0.5 block truncate text-[0.7rem] text-muted">
          AI-клиент
        </span>
      </div>
    </header>
  );
}
