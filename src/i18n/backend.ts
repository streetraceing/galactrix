import { getLocale, translateText, type MessageVariables } from './index';

type BackendErrorPayload = {
  key: string;
  variables?: MessageVariables;
};

const messages: Record<string, readonly [ru: string, en: string]> = {
  'backend.internal': [
    'Внутренняя ошибка: {detail}',
    'Internal error: {detail}',
  ],
  'backend.chat.titleRequired': ['Укажите название чата', 'Enter a chat name'],
  'backend.chat.titleTooLong': [
    'Название чата слишком длинное',
    'The chat name is too long',
  ],
  'backend.chat.notFound': ['Чат не найден', 'Chat not found'],
  'backend.message.notFound': ['Сообщение не найдено', 'Message not found'],
  'backend.message.empty': [
    'Сообщение не может быть пустым',
    'The message cannot be empty',
  ],
  'backend.message.userBeforeAssistantMissing': [
    'Перед ответом ассистента не найдено сообщение пользователя',
    'No user message was found before the assistant response',
  ],
  'backend.message.regenerateAssistantOnly': [
    'Перегенерировать можно только ответ ассистента',
    'Only assistant responses can be regenerated',
  ],
  'backend.message.variantsAssistantOnly': [
    'История вариантов доступна только для ответов ассистента',
    'Variant history is available only for assistant responses',
  ],
  'backend.message.variantNotFound': [
    'Вариант ответа не найден',
    'Response variant not found',
  ],
  'backend.provider.emptyResponse': [
    'Модель вернула пустой ответ',
    'The model returned an empty response',
  ],
  'backend.provider.selectForChat': [
    'Выберите провайдера в настройках чата',
    'Select a provider in chat settings',
  ],
  'backend.provider.notFound': [
    'Подключение не найдено',
    'Connection not found',
  ],
  'backend.provider.nameRequired': [
    'Укажите название подключения',
    'Enter a connection name',
  ],
  'backend.provider.modelRequired': ['Укажите модель', 'Select a model'],
  'backend.provider.apiKeyRequired': [
    'Для этого провайдера нужен API-ключ',
    'This provider requires an API key',
  ],
  'backend.provider.apiKeyMissing': [
    'API-ключ ещё не добавлен',
    'The API key has not been added yet',
  ],
  'backend.provider.apiKeyNotInStorage': [
    'API-ключ подключения не найден в защищённом хранилище',
    'The connection API key was not found in secure storage',
  ],
  'backend.provider.unknownKind': [
    'Неизвестный тип провайдера',
    'Unknown provider type',
  ],
  'backend.provider.notOpenAiCompatible': [
    'Провайдер не использует OpenAI-совместимый API',
    'The provider does not use an OpenAI-compatible API',
  ],
  'backend.provider.temperatureRange': [
    'Temperature должна быть от 0 до 2',
    'Temperature must be between 0 and 2',
  ],
  'backend.provider.topPRange': [
    'Top P должна быть от 0 до 1',
    'Top P must be between 0 and 1',
  ],
  'backend.provider.maxTokensPositive': [
    'Max tokens должно быть больше нуля',
    'Max tokens must be greater than zero',
  ],
  'backend.provider.characterAiUnsupported': [
    'Для Character.AI нужен отдельный адаптер; операция отменена',
    'Character.AI requires a dedicated adapter; the operation was cancelled',
  ],
  'backend.provider.connectionFailed': [
    'Не удалось подключиться к API: {detail}',
    'Could not connect to the API: {detail}',
  ],
  'backend.provider.requestFailed': [
    'Запрос к модели не выполнен: {detail}',
    'The model request failed: {detail}',
  ],
  'backend.provider.responseReadFailed': [
    'Не удалось прочитать ответ API: {detail}',
    'Could not read the API response: {detail}',
  ],
  'backend.provider.httpError': [
    'API вернул ошибку: {detail}',
    'The API returned an error: {detail}',
  ],
  'backend.common.nameRequired': ['Укажите название', 'Enter a name'],
  'backend.common.nameTooLong': [
    'Название слишком длинное',
    'The name is too long',
  ],
  'backend.common.fieldRequired': [
    'Укажите {field}',
    'Enter or select {field}',
  ],
  'backend.galaxy.notFound': [
    'Объект Галактики не найден',
    'Galaxy object not found',
  ],
  'backend.galaxy.contextObjectNotFound': [
    'Связанный объект контекста типа {kind} не найден',
    'A linked context object of type {kind} was not found',
  ],
  'backend.galaxy.dataMustBeObject': [
    'Параметры объекта должны быть JSON-объектом',
    'Object data must be a JSON object',
  ],
  'backend.galaxy.kindImmutable': [
    'Тип существующего объекта нельзя изменить',
    'The type of an existing object cannot be changed',
  ],
  'backend.galaxy.dataTooLarge': [
    'Параметры объекта слишком большие',
    'The object data is too large',
  ],
  'backend.galaxy.stylePresetUnknown': [
    'Неизвестный пресет стиля персонажа',
    'Unknown character style preset',
  ],
  'backend.galaxy.savedStyleRequired': [
    'Выберите сохранённый стиль переписки',
    'Select a saved messaging style',
  ],
  'backend.galaxy.promptSetReferenceInvalid': [
    'Некорректная ссылка на набор промптов',
    'Invalid prompt set reference',
  ],
  'backend.galaxy.kindUnknown': [
    'Неизвестный тип объекта Галактики',
    'Unknown Galaxy object type',
  ],
  'backend.promptSet.invalid': [
    'Некорректная структура набора промптов',
    'Invalid prompt set structure',
  ],
  'backend.promptSet.nestedNotAllowed': [
    'Набор промптов не может подключать другие наборы',
    'Prompt sets cannot include other prompt sets',
  ],
  'backend.promptSet.limit': [
    'Можно подключить не больше 16 наборов промптов',
    'You can connect up to 16 prompt sets',
  ],
  'backend.promptSet.duplicate': [
    'Наборы промптов не должны повторяться',
    'Prompt sets cannot be duplicated',
  ],
  'backend.prompt.ruleUnknown': [
    'Неизвестное правило системного промпта',
    'Unknown system prompt rule',
  ],
  'backend.prompt.ruleDuplicate': [
    'Правила системного промпта не должны повторяться',
    'System prompt rules cannot be duplicated',
  ],
  'backend.prompt.priorityUnknown': [
    'Неизвестный приоритет системного промпта',
    'Unknown system prompt priority',
  ],
  'backend.prompt.blockLimit': [
    'В одном чате можно создать не больше 16 блоков промпта',
    'A chat can contain up to 16 prompt blocks',
  ],
  'backend.prompt.blockIdDuplicate': [
    'Блоки промпта должны иметь уникальные идентификаторы',
    'Prompt blocks must have unique identifiers',
  ],
  'backend.prompt.blockTitleTooLong': [
    'Название блока промпта не должно быть длиннее 80 символов',
    'A prompt block title cannot exceed 80 characters',
  ],
  'backend.prompt.blockTitleRequired': [
    'У включённого блока промпта должно быть название',
    'An enabled prompt block must have a title',
  ],
  'backend.prompt.blockPriorityUnknown': [
    'Неизвестный приоритет блока промпта',
    'Unknown prompt block priority',
  ],
  'backend.prompt.blockContentRequired': [
    'Включённый блок промпта не может быть пустым',
    'An enabled prompt block cannot be empty',
  ],
  'backend.prompt.blockTooLong': [
    'Один блок промпта не может быть длиннее 12 000 символов',
    'A prompt block cannot exceed 12,000 characters',
  ],
  'backend.prompt.blocksTooLarge': [
    'Суммарный объём пользовательских блоков промпта слишком большой',
    'The combined custom prompt blocks are too large',
  ],
  'backend.profile.nameTooLong': [
    'Имя профиля слишком длинное',
    'The profile name is too long',
  ],
  'backend.profile.imageUnsupported': [
    'Неподдерживаемый формат изображения профиля',
    'Unsupported profile image format',
  ],
  'backend.profile.imageTooLarge': [
    'Изображение профиля слишком большое',
    'The profile image is too large',
  ],
  'backend.secureStorage.unavailable': [
    'Защищённое хранилище недоступно: {detail}',
    'Secure storage is unavailable: {detail}',
  ],
};

function interpolate(message: string, variables: MessageVariables = {}) {
  return message.replace(/\{(\w+)\}/g, (source, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key)
      ? String(variables[key])
      : source,
  );
}

function isBackendError(value: unknown): value is BackendErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'key' in value &&
    typeof (value as { key?: unknown }).key === 'string'
  );
}

export function localizeBackendError(error: unknown) {
  if (isBackendError(error)) {
    const message = messages[error.key];
    if (message) {
      return interpolate(
        message[getLocale() === 'ru' ? 0 : 1],
        error.variables,
      );
    }
  }

  const raw = error instanceof Error ? error.message : String(error);
  return translateText(raw);
}
