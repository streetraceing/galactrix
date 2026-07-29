import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header flex h-52 shrink-0 flex-col justify-between gap-3 overflow-hidden text-left min-[821px]:h-auto min-[821px]:flex-row min-[821px]:items-start min-[821px]:gap-4 min-[821px]:overflow-visible">
      <div className="min-w-0 shrink-0">
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 shrink-0 items-center gap-2 min-[821px]:w-fit">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
