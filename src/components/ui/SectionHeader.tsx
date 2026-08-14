import type { ReactNode } from 'react';

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        {description ? (
          <p className="section-description">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="section-header__actions">{actions}</div>
      ) : null}
    </div>
  );
}
