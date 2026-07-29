import type { GalaxyItem } from '../types';

export function galaxyItemAvatar(item?: GalaxyItem) {
  if (!item || (item.kind !== 'persona' && item.kind !== 'character')) {
    return undefined;
  }

  const data =
    typeof item.data === 'object' &&
    item.data !== null &&
    !Array.isArray(item.data)
      ? (item.data as Record<string, unknown>)
      : {};
  const avatar = data.avatar;
  return typeof avatar === 'string' && avatar.startsWith('data:image/')
    ? avatar
    : undefined;
}

export function galaxyInputAvatar(data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return undefined;
  const avatar = (data as Record<string, unknown>).avatar;
  return typeof avatar === 'string' && avatar.startsWith('data:image/')
    ? avatar
    : undefined;
}

export function withAvatar<T extends object>(data: T, avatar?: string): T {
  const next = { ...data } as T & { avatar?: string };
  if (avatar) next.avatar = avatar;
  else delete next.avatar;
  return next;
}
