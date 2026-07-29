import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { englishMessages } from './en';
import { semanticMessages, semanticPatterns } from './semantic';

export type LanguagePreference = 'system' | 'ru' | 'en';
export type AppLocale = 'ru' | 'en';
export type MessageVariables = Record<string, string | number>;
export type PluralMessages = {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

const STORAGE_KEY = 'galactrix-language';
const listeners = new Set<() => void>();
const translationCache = new Map<string, string>();

function storedPreference(): LanguagePreference {
  if (typeof localStorage === 'undefined') return 'system';
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'ru' || value === 'en' || value === 'system'
    ? value
    : 'system';
}

let preference: LanguagePreference = storedPreference();

function systemLocale(): AppLocale {
  if (typeof navigator === 'undefined') return 'en';
  const language = navigator.languages[0] ?? navigator.language;
  return language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

function resolveLocale(value: LanguagePreference): AppLocale {
  return value === 'system' ? systemLocale() : value;
}

let locale = resolveLocale(preference);

function notify() {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
  for (const listener of listeners) listener();
}

export function getLocale() {
  return locale;
}

export function getLanguagePreference() {
  return preference;
}

export function setLanguagePreference(value: LanguagePreference) {
  const nextLocale = resolveLocale(value);
  const changed = preference !== value || locale !== nextLocale;
  preference = value;
  locale = nextLocale;
  translationCache.clear();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, value);
  }
  if (changed) notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  return `${preference}:${locale}`;
}

function format(message: string, variables: MessageVariables = {}) {
  return message.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key)
      ? String(variables[key])
      : match,
  );
}

const dynamicPatterns: Array<[RegExp, string]> = [
  [/^Редактирование:\s*(.+)$/u, 'Editing: $1'],
  [/^Новый объект\s*[-—]\s*(.+)$/u, 'New object — $1'],
  [/^Раздел «(.+)» пуст$/u, 'The “$1” section is empty'],
  [/^Выбрано:\s*(\d+)\s+из\s+(\d+)$/u, 'Selected: $1 of $2'],
  [/^Выбрано:\s*(\d+)$/u, 'Selected: $1'],
  [/^Текущий масштаб:\s*(.+)$/u, 'Current scale: $1'],
  [/^Сохранено:\s*(.+)\.\s*Выбран\s*(\d+)\.$/u, 'Saved: $1. Selected $2.'],
  [/^Сохранено:\s*(.+)$/u, 'Saved: $1'],
  [/^Стиль:\s*(.+)$/u, 'Style: $1'],
  [/^Контекст:\s*(.+)$/u, 'Context: $1'],
  [/^Приоритет:\s*(.+)$/u, 'Priority: $1'],
  [/^«(.+)» сохранено$/u, '“$1” saved'],
  [/^«(.+)» доступно$/u, '“$1” is available'],
  [/^«(.+)» не отвечает$/u, '“$1” is not responding'],
  [/^Проверяем «(.+)»$/u, 'Checking “$1”'],
  [/^Не удалось проверить «(.+)»$/u, 'Could not check “$1”'],
  [/^Фото «(.+)» обновлено$/u, 'Photo for “$1” updated'],
  [/^Фото «(.+)» удалено$/u, 'Photo for “$1” removed'],
  [/^Ответ за (\d+) мс$/u, 'Response in $1 ms'],
  [/^API ответил за (\d+) мс$/u, 'API responded in $1 ms'],
  [/^(\d+) мин$/u, '$1 min ago'],
  [/^(\d+) ч$/u, '$1 hr ago'],
  [/^(\d+) дн$/u, '$1 d ago'],
  [/^Всего:\s*(\d+)$/u, 'Total: $1'],
  [/^Успешно проверено:\s*(\d+)$/u, 'Successfully checked: $1'],
  [/^Проблем обнаружено:\s*(\d+)$/u, 'Problems found: $1'],
  [/^Добавлено или обновлено:\s*(\d+)$/u, 'Added or updated: $1'],
  [/^Сохранено ключей:\s*(\d+)$/u, 'Saved keys: $1'],
  [
    /^Подключений без API-ключей:\s*(\d+)$/u,
    'Connections without API keys: $1',
  ],
  [
    /^Подключения и API-ключи в JSON:\s*(\d+)$/u,
    'Connections and API keys in JSON: $1',
  ],
  [
    /^Доступно:\s*(\d+)\s*·\s*с ошибкой:\s*(\d+)$/u,
    'Available: $1 · failed: $2',
  ],
  [
    /^Все сообщения из чата «(.+)» будут удалены\.$/u,
    'All messages in “$1” will be deleted.',
  ],
  [
    /^Чат «(.+)» и все сообщения будут удалены\.$/u,
    'Chat “$1” and all its messages will be deleted.',
  ],
  [
    /^Подключение «(.+)» и сохранённый ключ будут удалены\.$/u,
    'Connection “$1” and its saved key will be removed.',
  ],
  [
    /^Объект «(.+)» будет удалён из библиотеки и отвязан от чатов\.$/u,
    '“$1” will be removed from the library and unlinked from chats.',
  ],
  [/^Набор «(.+)» пуст$/u, 'Set “$1” is empty'],
  [/^Набор «(.+)»$/u, 'Set “$1”'],
  [/^Набор · 1 правил$/u, 'Set · 1 rule'],
  [/^Набор · (\d+) правил$/u, 'Set · $1 rules'],
  [
    /^Некорректное подключение в экспорте: строка (\d+)$/u,
    'Invalid connection in export: row $1',
  ],
  [
    /^Некорректный объект в экспорте: строка (\d+)$/u,
    'Invalid object in export: row $1',
  ],
  [/^Перетащить блок «(.+)»$/u, 'Drag block “$1”'],
  [/^(\d+)px · Чаты$/u, '$1px · Chats'],
  [/^(.+) - копия$/u, '$1 - copy'],
  [/^(.+) - ветка$/u, '$1 - branch'],
  [/^([+-]?\d+)% к прошлой неделе$/u, '$1% vs previous week'],
  [/^(\d+)% приходится на ответы$/u, '$1% used for responses'],
  [/^(.+ tokens?) контекста$/u, '$1 of context'],
];

export function translateText(value: string) {
  if (!value.trim()) return value;
  const cached = translationCache.get(value);
  if (cached) return cached;
  const leading = value.match(/^\s*/u)?.[0] ?? '';
  const trailing = value.match(/\s*$/u)?.[0] ?? '';
  const source = value.trim();
  const semantic = semanticMessages[source];
  if (semantic) {
    const translated = `${leading}${semantic[locale === 'ru' ? 0 : 1]}${trailing}`;
    translationCache.set(value, translated);
    return translated;
  }
  for (const [pattern, ru, en] of semanticPatterns) {
    if (!pattern.test(source)) continue;
    const translated = `${leading}${source.replace(
      pattern,
      locale === 'ru' ? ru : en,
    )}${trailing}`;
    translationCache.set(value, translated);
    return translated;
  }
  if (locale === 'ru') return value;
  const exact = englishMessages[source];
  if (exact) {
    const translated = `${leading}${exact}${trailing}`;
    translationCache.set(value, translated);
    return translated;
  }

  for (const [pattern, replacement] of dynamicPatterns) {
    if (pattern.test(source)) {
      const translated = `${leading}${source.replace(pattern, replacement)}${trailing}`;
      translationCache.set(value, translated);
      return translated;
    }
  }

  if (translationCache.size > 1500) translationCache.clear();
  translationCache.set(value, value);
  return value;
}

export function t(message: string, variables?: MessageVariables) {
  return format(translateText(message), variables);
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDate(
  value: Date | number,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(locale, options).format(value);
}

export function plural(
  value: number,
  messages: PluralMessages,
  variables: MessageVariables = {},
) {
  const category = new Intl.PluralRules(locale).select(value);
  const message = messages[category] ?? messages.other;
  return t(message, {
    ...variables,
    count: formatNumber(value),
  });
}

type I18nContextValue = {
  locale: AppLocale;
  preference: LanguagePreference;
  t: typeof t;
  setLanguage: typeof setLanguagePreference;
};

const I18nContext = createContext<I18nContextValue>({
  locale,
  preference,
  t,
  setLanguage: setLanguagePreference,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  const currentLocale = getLocale();
  const currentPreference = getLanguagePreference();

  useEffect(() => {
    document.documentElement.lang = currentLocale;
    const refresh = () => {
      if (preference !== 'system') return;
      const nextLocale = systemLocale();
      if (locale === nextLocale) return;
      locale = nextLocale;
      translationCache.clear();
      notify();
    };
    window.addEventListener('languagechange', refresh);
    return () => window.removeEventListener('languagechange', refresh);
  }, [currentLocale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale: currentLocale,
      preference: currentPreference,
      t,
      setLanguage: setLanguagePreference,
    }),
    [currentLocale, currentPreference],
  );

  return createElement(
    I18nContext.Provider,
    { value, key: currentLocale },
    children,
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
