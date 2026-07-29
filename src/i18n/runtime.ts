import { getLocale, translateText } from './index';

const localizedProps = new Set([
  'title',
  'description',
  'label',
  'placeholder',
  'aria-label',
  'aria-description',
  'textValue',
  'alt',
  'emptyContent',
  'errorMessage',
]);

function localizeChild(value: unknown): unknown {
  if (typeof value === 'string') return translateText(value);
  if (!Array.isArray(value)) return value;

  let changed = false;
  const localized = value.map((child) => {
    const nextChild = localizeChild(child);
    if (nextChild !== child) changed = true;
    return nextChild;
  });
  return changed ? localized : value;
}

export function localizeJsxProps(props: unknown) {
  if (getLocale() === 'ru' || !props || typeof props !== 'object') return props;

  const source = props as Record<string, unknown>;
  let result = source;
  const set = (key: string, value: unknown) => {
    if (result === source) result = { ...source };
    result[key] = value;
  };

  if ('children' in source) {
    const children = localizeChild(source.children);
    if (children !== source.children) set('children', children);
  }

  for (const key of localizedProps) {
    if (typeof source[key] !== 'string') continue;
    const value = translateText(source[key]);
    if (value !== source[key]) set(key, value);
  }
  return result;
}
