import { Avatar } from '@heroui/react';
import { memo } from 'react';
import { Icon } from '../Icon';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('ru-RU'))
    .join('');
}

function AppAvatarComponent({
  src,
  name,
  className = 'size-10',
  square = false,
}: {
  src?: string;
  name: string;
  className?: string;
  square?: boolean;
}) {
  const fallback = initials(name);
  const shapeClass = square ? 'rounded-xl' : 'rounded-full';

  return (
    <Avatar
      key={src ?? `fallback:${fallback}`}
      variant="soft"
      color="default"
      className={`${className} ${shapeClass} shrink-0 border border-separator`}
    >
      {src ? (
        <Avatar.Image
          src={src}
          alt={name}
          className={`${shapeClass} object-cover`}
        />
      ) : null}
      <Avatar.Fallback
        className={`${shapeClass} border-none bg-default font-medium text-muted`}
      >
        {fallback || <Icon name="user" className="size-1/2" />}
      </Avatar.Fallback>
    </Avatar>
  );
}

export const AppAvatar = memo(AppAvatarComponent);
