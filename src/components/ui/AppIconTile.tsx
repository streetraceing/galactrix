import { cn } from '../../lib/cn';
import { Icon, type IconName } from '../Icon';

const sizeClasses = {
  sm: 'size-8 rounded-lg [&_svg]:size-4',
  md: 'size-10 rounded-xl [&_svg]:size-5',
  lg: 'size-12 rounded-2xl [&_svg]:size-6',
} as const;

const toneClasses = {
  accent: 'bg-accent/10 text-accent',
  neutral: 'bg-default text-muted',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
} as const;

export function AppIconTile({
  icon,
  size = 'md',
  tone = 'accent',
  className,
}: {
  icon: IconName;
  size?: keyof typeof sizeClasses;
  tone?: keyof typeof toneClasses;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center',
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
      aria-hidden="true"
    >
      <Icon name={icon} />
    </span>
  );
}
