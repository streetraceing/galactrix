use std::collections::HashMap;

use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub key: String,
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub variables: HashMap<String, String>,
}

pub type CommandResult<T> = Result<T, CommandError>;

impl From<&str> for CommandError {
    fn from(message: &str) -> Self {
        Self::from(message.to_owned())
    }
}

impl From<String> for CommandError {
    fn from(message: String) -> Self {
        let key = message_key(&message).to_owned();
        let mut variables = HashMap::new();
        if key == "backend.internal" {
            variables.insert("detail".into(), message.clone());
        } else if matches!(
            key.as_str(),
            "backend.provider.connectionFailed"
                | "backend.provider.requestFailed"
                | "backend.provider.responseReadFailed"
                | "backend.provider.httpError"
                | "backend.secureStorage.unavailable"
                | "backend.provider.unknownKind"
        ) {
            if key == "backend.provider.httpError" {
                variables.insert("detail".into(), message.clone());
            } else if let Some((_, detail)) = message.split_once(": ") {
                variables.insert("detail".into(), detail.to_owned());
            }
        } else if key == "backend.galaxy.contextObjectNotFound" {
            let kind = message
                .strip_prefix("Объект типа ")
                .and_then(|value| value.strip_suffix(" не найден"));
            if let Some(kind) = kind {
                variables.insert("kind".into(), kind.to_owned());
            }
        } else if key == "backend.common.fieldRequired" {
            if let Some(field) = message.strip_prefix("Укажите ") {
                variables.insert("field".into(), field.to_owned());
            }
        }
        Self { key, variables }
    }
}

fn message_key(message: &str) -> &'static str {
    match message {
        "Название чата не может быть пустым" | "Укажите название чата" => {
            "backend.chat.titleRequired"
        }
        "Название чата слишком длинное" => "backend.chat.titleTooLong",
        "Чат не найден" => "backend.chat.notFound",
        "Сообщение не найдено" => "backend.message.notFound",
        "Сообщение не может быть пустым" | "Пустое сообщение не отправляется" => {
            "backend.message.empty"
        }
        "Перед ответом ассистента не найдено сообщение пользователя" => {
            "backend.message.userBeforeAssistantMissing"
        }
        "Модель вернула пустой ответ"
        | "Ollama вернул ответ без текста"
        | "Провайдер вернул ответ без choices[0].message.content"
        | "Провайдер вернул пустой текст" => "backend.provider.emptyResponse",
        "Перегенерировать можно только ответ ассистента" => {
            "backend.message.regenerateAssistantOnly"
        }
        "История вариантов доступна только для ответов ассистента" => {
            "backend.message.variantsAssistantOnly"
        }
        "Вариант ответа не найден" => "backend.message.variantNotFound",
        "Выберите провайдера в настройках чата" => "backend.provider.selectForChat",
        "Подключение не найдено" => "backend.provider.notFound",
        "Укажите название подключения" => "backend.provider.nameRequired",
        "Укажите модель" | "У подключения не выбрана модель" => {
            "backend.provider.modelRequired"
        }
        "Для этого провайдера нужен API-ключ" => "backend.provider.apiKeyRequired",
        "API-ключ ещё не добавлен" => "backend.provider.apiKeyMissing",
        "API-ключ подключения не найден в защищённом хранилище" => {
            "backend.provider.apiKeyNotInStorage"
        }
        "Неизвестный тип провайдера" => "backend.provider.unknownKind",
        "Провайдер не использует OpenAI-compatible API" => {
            "backend.provider.notOpenAiCompatible"
        }
        "Temperature должна быть от 0 до 2" => "backend.provider.temperatureRange",
        "Top P должна быть от 0 до 1" => "backend.provider.topPRange",
        "Max tokens должно быть больше нуля" => "backend.provider.maxTokensPositive",
        "Character.AI требует отдельного адаптера; подключение не было сохранено"
        | "Character.AI нельзя импортировать без отдельного адаптера"
        | "Character.AI не предоставляет совместимый публичный API; нужен отдельный адаптер"
        | "Для Character.AI ещё не реализован отдельный адаптер авторизации" => {
            "backend.provider.characterAiUnsupported"
        }
        "Укажите название" => "backend.common.nameRequired",
        "Название слишком длинное" => "backend.common.nameTooLong",
        "Объект Галактики не найден" => "backend.galaxy.notFound",
        "Параметры объекта должны быть JSON-объектом" => "backend.galaxy.dataMustBeObject",
        "Тип существующего объекта нельзя изменить" => "backend.galaxy.kindImmutable",
        "Параметры объекта слишком большие" => "backend.galaxy.dataTooLarge",
        "Некорректная структура набора промптов" => "backend.promptSet.invalid",
        "Набор промптов не может подключать другие наборы" => {
            "backend.promptSet.nestedNotAllowed"
        }
        "Можно подключить не больше 16 наборов промптов" => "backend.promptSet.limit",
        "Наборы промптов не должны повторяться" => "backend.promptSet.duplicate",
        "Неизвестный пресет стиля персонажа" => "backend.galaxy.stylePresetUnknown",
        "Выберите сохранённый стиль переписки" => "backend.galaxy.savedStyleRequired",
        "Некорректная ссылка на набор промптов" => {
            "backend.galaxy.promptSetReferenceInvalid"
        }
        "Неизвестный тип объекта галактики" => "backend.galaxy.kindUnknown",
        "Неизвестное правило системного промпта" => "backend.prompt.ruleUnknown",
        "Правила системного промпта не должны повторяться" => {
            "backend.prompt.ruleDuplicate"
        }
        "Неизвестный приоритет системного промпта" => "backend.prompt.priorityUnknown",
        "В одном чате можно создать не больше 16 блоков промпта" => {
            "backend.prompt.blockLimit"
        }
        "Блоки промпта должны иметь уникальные идентификаторы" => {
            "backend.prompt.blockIdDuplicate"
        }
        "Название блока промпта не должно быть длиннее 80 символов" => {
            "backend.prompt.blockTitleTooLong"
        }
        "У включённого блока промпта должно быть название" => {
            "backend.prompt.blockTitleRequired"
        }
        "Неизвестный приоритет блока промпта" => "backend.prompt.blockPriorityUnknown",
        "Включённый блок промпта не может быть пустым" => {
            "backend.prompt.blockContentRequired"
        }
        "Один блок промпта не может быть длиннее 12 000 символов" => {
            "backend.prompt.blockTooLong"
        }
        "Суммарный объём пользовательских блоков промпта слишком большой" => {
            "backend.prompt.blocksTooLarge"
        }
        "Имя профиля слишком длинное" => "backend.profile.nameTooLong",
        "Неподдерживаемый формат изображения профиля" => {
            "backend.profile.imageUnsupported"
        }
        "Изображение профиля слишком большое" => "backend.profile.imageTooLarge",
        _ if message.starts_with("Не удалось подключиться к API:") => {
            "backend.provider.connectionFailed"
        }
        _ if message.starts_with("Запрос к модели не выполнен:") => {
            "backend.provider.requestFailed"
        }
        _ if message.starts_with("Не удалось прочитать ответ API:") => {
            "backend.provider.responseReadFailed"
        }
        _ if message.starts_with("Защищённое хранилище недоступно:") => {
            "backend.secureStorage.unavailable"
        }
        _ if message.starts_with("Неизвестный тип провайдера:") => {
            "backend.provider.unknownKind"
        }
        _ if message.starts_with("HTTP ") => "backend.provider.httpError",
        _ if message.starts_with("Объект типа ") => "backend.galaxy.contextObjectNotFound",
        _ if message.starts_with("Укажите ") => "backend.common.fieldRequired",
        _ => "backend.internal",
    }
}
