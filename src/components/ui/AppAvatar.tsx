import { Avatar } from '@heroui/react';
import { Icon } from '../Icon';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('ru-RU'))
    .join('');
}

export function AppAvatar({
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
      className={`${className} ${shapeClass} shrink-0 bg-accent/10 ring-1 ring-separator`}
    >
      {src ? (
        <Avatar.Image
          src={src}
          alt={name}
          className={`${shapeClass} object-cover`}
        />
      ) : null}
      <Avatar.Fallback
        className={`${shapeClass} border-none bg-accent/10 font-semibold text-accent`}
      >
        {fallback || <Icon name="user" className="size-1/2" />}
      </Avatar.Fallback>
    </Avatar>
  );
}
