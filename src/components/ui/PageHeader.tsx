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
    <header className="page-header page-header-enter">
      <div className="page-header-copy flex w-full min-w-0 shrink-0 flex-col items-center justify-center px-0 md:h-auto md:flex-1 md:items-start">
        <h1 className="page-title w-full text-center md:text-left">{title}</h1>
        {description ? (
          <p className="page-description text-center md:text-left">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
