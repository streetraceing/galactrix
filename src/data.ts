import type { AppSnapshot, ProviderKind } from './types';

export const providerCatalog: Array<{
  kind: ProviderKind;
  name: string;
  note: string;
  defaultBaseUrl?: string;
  requiresAccountId?: boolean;
}> = [
  { kind: 'mistral', name: 'Mistral', note: 'Официальный Mistral API' },
  {
    kind: 'character-ai',
    name: 'Character AI',
    note: 'Авторизация сессией / токеном',
  },
  {
    kind: 'cerebras',
    name: 'Cerebras',
    note: 'Быстрый OpenAI-совместимый API',
  },
  { kind: 'nvidia-nim', name: 'NVIDIA NIM', note: 'Каталог моделей NVIDIA' },
  {
    kind: 'ollama-cloud',
    name: 'Ollama Cloud',
    note: 'Облачные Ollama-модели',
  },
  {
    kind: 'cloudflare-workers-ai',
    name: 'Cloudflare Workers AI',
    note: 'Токен + Account ID',
    requiresAccountId: true,
  },
  {
    kind: 'custom',
    name: 'Кастомный',
    note: 'Любой OpenAI-совместимый endpoint',
    defaultBaseUrl: 'https://api.example.com/v1',
  },
];

export const mockSnapshot: AppSnapshot = {
  chats: [
    {
      id: 'chat-1',
      title: 'Город под стеклянным небом',
      preview: 'Продолжим сцену с момента, когда поезд остановился...',
      updatedAt: '12 мин',
      messageCount: 84,
      pinned: true,
    },
    {
      id: 'chat-2',
      title: 'Rust: архитектура провайдеров',
      preview: 'Лучше вынести общий интерфейс в trait и адаптеры...',
      updatedAt: 'вчера',
      messageCount: 31,
      pinned: false,
    },
    {
      id: 'chat-3',
      title: 'Лира — тест персонажа',
      preview: 'Я не помню звёзды, но помню их названия.',
      updatedAt: 'пн',
      messageCount: 126,
      pinned: false,
    },
  ],
  messages: [
    {
      id: 'message-1',
      chatId: 'chat-1',
      role: 'assistant',
      content:
        'Поезд остановился без толчка. За стеклом не было станции — только тихий город под огромным прозрачным куполом.',
      createdAt: '23:14',
    },
    {
      id: 'message-2',
      chatId: 'chat-1',
      role: 'user',
      content:
        'Пусть мой персонаж выйдет первым и попробует понять, кто выключил свет на платформе.',
      createdAt: '23:15',
    },
    {
      id: 'message-3',
      chatId: 'chat-1',
      role: 'assistant',
      content:
        'Двери раскрылись. На платформе пахло мокрым металлом, а в дальнем конце кто-то медленно поднял фонарь — но свет в нём был чёрным.',
      createdAt: '23:15',
    },
  ],
  galaxyItems: [
    {
      id: 'galaxy-1',
      kind: 'persona',
      name: 'Наблюдатель',
      description:
        'Спокойная персона для вдумчивых технических и творческих диалогов.',
      badge: 'Персона',
      accent: 'violet',
      updatedAt: 'сегодня',
    },
    {
      id: 'galaxy-2',
      kind: 'character',
      name: 'Лира Вейл',
      description:
        'Проводница между мирами, скрывающая происхождение своей памяти.',
      badge: 'Персонаж',
      accent: 'cyan',
      updatedAt: 'вчера',
    },
    {
      id: 'galaxy-3',
      kind: 'universe',
      name: 'Стеклянное небо',
      description:
        'Мир городов-куполов, забытых поездов и медленно гаснущих звёзд.',
      badge: 'Вселенная',
      accent: 'rose',
      updatedAt: '3 дня',
    },
    {
      id: 'galaxy-4',
      kind: 'worldbook',
      name: 'Фракции и технологии',
      description:
        '42 записи: организации, артефакты, правила магии и ключевые места.',
      badge: 'Ворлдбук',
      accent: 'amber',
      updatedAt: 'неделю',
    },
  ],
  providers: [
    {
      id: 'provider-1',
      name: 'Mistral',
      kind: 'mistral',
      model: 'mistral-large-latest',
      status: 'connected',
      latencyMs: 420,
    },
    {
      id: 'provider-2',
      name: 'Ollama Cloud',
      kind: 'ollama-cloud',
      model: 'qwen3:32b',
      status: 'disabled',
    },
  ],
  settings: {
    animations: true,
    haptics: true,
    compactMode: false,
    sendOnEnter: true,
    saveDrafts: true,
  },
  usage: [
    { label: 'Пн', tokens: 18000, requests: 21 },
    { label: 'Вт', tokens: 32000, requests: 39 },
    { label: 'Ср', tokens: 26000, requests: 32 },
    { label: 'Чт', tokens: 47000, requests: 55 },
    { label: 'Пт', tokens: 39000, requests: 44 },
    { label: 'Сб', tokens: 61000, requests: 73 },
    { label: 'Вс', tokens: 52000, requests: 64 },
  ],
};
