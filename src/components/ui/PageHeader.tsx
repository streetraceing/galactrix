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
    <header className="page-header page-header-enter flex shrink-0 flex-col gap-3 overflow-hidden text-center md:flex-row md:items-start md:justify-between md:gap-4 md:overflow-visible md:text-left">
      <div className="page-header-copy flex w-full min-w-0 shrink-0 flex-col items-center justify-center px-0 md:h-auto md:flex-1 md:items-start">
        <h1 className="page-title w-full text-center md:text-left">{title}</h1>
        {description ? (
          <p className="page-description text-center md:text-left">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 shrink-0 items-center justify-center gap-2 md:w-fit md:justify-start">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
