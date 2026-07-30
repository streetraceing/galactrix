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
    <header className="page-header page-header-enter flex h-52 shrink-0 flex-col justify-between gap-3 overflow-hidden text-left md:h-auto md:flex-row md:items-start md:gap-4 md:overflow-visible">
      <div className="min-w-0 shrink-0 flex items-center flex-col justify-center flex-1 md:items-start">
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 shrink-0 items-center gap-2 md:w-fit justify-center lg:justify-start">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
