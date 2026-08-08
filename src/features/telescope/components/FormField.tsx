import type { ReactNode } from 'react';
import { RequiredMark } from '../../../components/ui/RequiredMark';

export function FormField({
  label,
  children,
  required = false,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      {children}
    </div>
  );
}
