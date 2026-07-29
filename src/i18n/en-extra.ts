export const extraEnglishMessages: Record<string, string> = {
  Ассистент: 'Assistant',
  Пользователь: 'User',
  Вы: 'You',
  персону: 'persona',
  персонажа: 'character',
  вселенную: 'universe',
  ворлдбук: 'worldbook',
  стиль: 'style',
  'набор промптов': 'prompt set',
  Все: 'All',
  Выбран: 'Selected',
  'Выбрано:': 'Selected:',
  из: 'of',
  и: 'and',
  Сообщение: 'Message',
  Сообщения: 'Messages',
  Токенов: 'Tokens',
  Доступен: 'Available',
  Доступны: 'Available',
  'Не проверен': 'Not checked',
  'Не проверено': 'Not checked',
  Необязательно: 'Optional',
  Изменено: 'Modified',
  'Можно добавить позже': 'Can be added later',
  'Можно указать вручную': 'Can be entered manually',
  Основная: 'Main',
  Край: 'Edge',
  Отправляется: 'Sending',
  отвечает: 'is typing',
  'px · Чаты': 'px · Chats',
  'Настройки берутся из подключения': 'Uses connection settings',
  'Библиотека и диалоги': 'Library and chats',
  'Быстрый срез настроенного окружения.':
    'A quick summary of the configured environment.',
  'Готовность приложения': 'App readiness',
  'Лор и стили': 'Lore and styles',
  'Локальные модели без API-ключа': 'Local models without an API key',
  'Облачные модели Ollama с Bearer API-ключом':
    'Ollama cloud models with a Bearer API key',
  'Модели разных провайдеров и автоматический роутер':
    'Models from multiple providers with automatic routing',
  'Высокоскоростной OpenAI-совместимый API': 'High-speed OpenAI-compatible API',
  'Gemini API через OpenAI-совместимый endpoint':
    'Gemini API through an OpenAI-compatible endpoint',
  'Inference Providers через единый OpenAI-совместимый Router':
    'Inference Providers through a unified OpenAI-compatible router',
  'Совместимый endpoint с /models и /chat/completions':
    'Compatible endpoint with /models and /chat/completions',
  'На Android укажите LAN-адрес компьютера с Ollama вместо localhost, например http://192.168.1.10:11434/api.':
    'On Android, use the computer’s LAN address for Ollama instead of localhost, for example http://192.168.1.10:11434/api.',
  'Для Character.AI нужен отдельный адаптер авторизации и протокола. Несовместимое подключение не сохраняется.':
    'Character.AI needs a dedicated authentication and protocol adapter. An incompatible connection is not saved.',
  'Поддержка появится после отдельного адаптера авторизации':
    'Support will be available after a dedicated authentication adapter is added',
  'Выберите тип API.': 'Select an API type.',
  'Идентификатор модели': 'Model ID',
  'Добавьте провайдера и загрузите доступные модели из его API.':
    'Add a provider and load the models available from its API.',
  'Список ещё не загружен': 'The list has not been loaded yet',
  'Статус отражает последнюю фактическую проверку API.':
    'Status reflects the latest actual API check.',
  'Проверьте адрес, модель и доступность API.':
    'Check the address, model, and API availability.',
  'Добавьте или обновите ключ доступа.': 'Add or update the access key.',
  'Проверяем все подключения': 'Checking all connections',
  'Все подключения доступны': 'All connections are available',
  'Нет доступных подключений': 'No connections are available',
  'Проверка завершена': 'Check complete',
  'Проверка завершена с ошибками': 'Check completed with errors',
  'Подключение удалено': 'Connection removed',
  'Подключений пока нет': 'No connections yet',
  'Удалить подключение?': 'Delete connection?',
  'Экспорт подключений': 'Export connections',
  'Экспорт Телескопа готов': 'Telescope export is ready',
  'Импорт Телескопа завершён': 'Telescope import complete',
  'Не удалось экспортировать подключения': 'Could not export connections',
  'Не удалось импортировать подключения': 'Could not import connections',
  'По умолчанию ключи остаются только в защищённом хранилище этого устройства.':
    'By default, keys remain only in secure storage on this device.',
  'Файл будет содержать ключи открытым текстом. Храните его как пароль и не отправляйте посторонним.':
    'The file will contain keys as plain text. Treat it like a password and do not share it.',
  'JSON можно импортировать в Galactrix на другом устройстве.':
    'The JSON file can be imported into Galactrix on another device.',
  'Выберите приложение или хранилище в системном меню.':
    'Choose an app or storage location in the system menu.',
  'Откроется системное окно сохранения файла.':
    'The system file-save dialog will open.',
  'Файл будет скачан с автоматически созданным именем.':
    'The file will be downloaded with an automatically generated name.',
  'Выберите только нужные объекты и место, куда сохранить JSON.':
    'Select only the objects you need and where to save the JSON file.',
  'Выберите только нужные подключения и способ сохранения JSON.':
    'Select only the connections you need and how to save the JSON file.',
  'Выберите изображение': 'Choose an image',
  'Изображение повреждено': 'The image is damaged',
  'Обработка изображений недоступна': 'Image processing is unavailable',
  'Не удалось прочитать изображение': 'Could not read the image',
  'Не удалось достаточно уменьшить изображение':
    'Could not reduce the image enough',
  'Исходный файл должен быть меньше 12 МБ':
    'The source file must be smaller than 12 MB',
  'Фото обрезается до квадрата и сохраняется только на этом устройстве.':
    'The photo is cropped to a square and stored only on this device.',
  'Фото будет показываться в библиотеке, заголовке чата и рядом с сообщениями.':
    'The photo appears in the library, chat header, and next to messages.',
  'Управляйте всеми изображениями в одном месте. Они также доступны в редакторе «Галактик».':
    'Manage all images in one place. They are also available in the Galaxies editor.',
  'Создайте их во вкладке «Галактики», после чего здесь появится управление фотографиями.':
    'Create them in Galaxies, then photo controls will appear here.',
  'Это имя и изображение используются для ваших сообщений, если в чате не выбрана отдельная персона.':
    'This name and image are used for your messages when no separate persona is selected in the chat.',
  'Как вас показывать в чатах': 'How you appear in chats',
  'Профиль обновлён': 'Profile updated',
  'Отображение и отклик приложения.': 'App appearance and feedback.',
  'Поведение редактора сообщений.': 'Message editor behavior.',
  'Переходы, появление элементов и жесты':
    'Transitions, element entrances, and gestures',
  'Меньше отступов и больше информации на экране':
    'Less spacing and more information on screen',
  'Используется на поддерживаемых устройствах': 'Used on supported devices',
  'Отдельный черновик для каждого чата': 'A separate draft for each chat',
  'Светлая или тёмная схема выбирается отдельно от цветового варианта.':
    'The light or dark mode is selected separately from the color theme.',
  Режим: 'Mode',
  'Цветовой вариант темы': 'Theme color variant',
  'Текущий масштаб:': 'Current scale:',
  'Уменьшить масштаб': 'Decrease scale',
  'Увеличить масштаб': 'Increase scale',
  'Изменить ширину основной панели': 'Change main sidebar width',
  'Изменить ширину списка чатов': 'Change chat list width',
  'Основная навигация': 'Main navigation',
  'Мобильная навигация': 'Mobile navigation',
  'Переключить боковую панель': 'Toggle sidebar',
  'Свернуть боковую панель': 'Collapse sidebar',
  'Развернуть боковую панель': 'Expand sidebar',
  'Свернуть или развернуть навигацию': 'Collapse or expand navigation',
  'Свернуть панель': 'Collapse panel',
  'Свернуть окно': 'Minimize window',
  'Развернуть окно': 'Maximize window',
  'Восстановить окно': 'Restore window',
  'Закрыть окно': 'Close window',
  'Закрыть уведомление': 'Dismiss notification',
  'Изменить режим главного окна': 'Change main window mode',
  'Развернуть или восстановить окно': 'Maximize or restore window',
  'Оставить Galactrix в панели задач': 'Keep Galactrix in the taskbar',
  'К списку чатов': 'Back to chats',
  'Очистить поиск': 'Clear search',
  'Открыть чат': 'Open chat',
  'Команда или поиск по чатам': 'Command or chat search',
  'Измените запрос или создайте новый чат.':
    'Change the query or create a new chat.',
  'Создайте чат и сразу выберите его ролевой контекст.':
    'Create a chat and choose its roleplay context immediately.',
  'Создать чат с провайдером и ролевым контекстом':
    'Create a chat with a provider and roleplay context',
  'Открыть:': 'Open:',
  'Перейти к разделу': 'Go to section',
  'Введите новое название.': 'Enter a new name.',
  'Новое название чата': 'New chat name',
  'Новый чат создан': 'New chat created',
  'Копия чата создана': 'Chat copy created',
  'Настройки чата сохранены': 'Chat settings saved',
  'Чат переименован': 'Chat renamed',
  'Чат удалён': 'Chat deleted',
  'Чат закреплён': 'Chat pinned',
  'Чат откреплён': 'Chat unpinned',
  'История чата очищена': 'Chat history cleared',
  'Очистить историю?': 'Clear history?',
  'Удалить чат?': 'Delete chat?',
  'Удалить сообщение?': 'Delete message?',
  'Все сообщения из чата будут удалены.': 'All chat messages will be deleted.',
  'Это действие нельзя отменить.': 'This action cannot be undone.',
  'Сообщение и вся история его вариантов исчезнут из этого чата.':
    'The message and its entire variant history will be removed from this chat.',
  'Изменение применяется к текущей истории диалога.':
    'The change applies to the current conversation history.',
  'Изменённый текст сохранится как новый вариант ответа.':
    'The edited text will be saved as a new response variant.',
  'Сообщение скопировано': 'Message copied',
  'Новый ответ': 'New response',
  'Сохранённые варианты': 'Saved variants',
  'Выбрать этот ответ': 'Select this response',
  'Предыдущий вариант ответа': 'Previous response variant',
  'Следующий вариант ответа': 'Next response variant',
  'Сгенерировать новый вариант ответа': 'Generate a new response variant',
  'Открыть историю ответов': 'Open response history',
  'Открыть полную историю': 'Open full history',
  Перегенерировать: 'Regenerate',
  'Отправка кнопкой': 'Send with button',
  'Откройте настройки чата и выберите провайдера.':
    'Open chat settings and select a provider.',
  'Открыть выбор провайдера в Телескопе':
    'Open provider selection in Telescope',
  'Сначала добавьте провайдера во вкладке «Телескоп».':
    'First add a provider in Telescope.',
  'Сообщения будут отправляться через': 'Messages will be sent through',
  'Провайдер, ролевой контекст и стиль ответа можно изменить в любое время.':
    'You can change the provider, roleplay context, and response style at any time.',
  'Одна персона пользователя, один персонаж, одна вселенная и несколько ворлдбуков.':
    'One user persona, one character, one universe, and multiple worldbooks.',
  'Контекст не выбран': 'No context selected',
  'контекст мира пока пуст': 'world context is empty',
  'Персона пользователя': 'User persona',
  'Персонаж ассистента': 'Assistant character',
  'Подключённые записи лора': 'Connected lore entries',
  'Встроенный стиль или собственный пресет из библиотеки «Галактики».':
    'A built-in style or a custom preset from the Galaxies library.',
  'Для кастомного стиля выберите сохранённый пресет из библиотеки.':
    'For a custom style, select a saved preset from the library.',
  'Сначала создайте объект типа «Стиль» в библиотеке.':
    'First create a Style object in the library.',
  'Сохранённый стиль': 'Saved style',
  Пресет: 'Preset',
  'Своя инструкция': 'Custom instruction',
  'Пресет можно выбрать в настройках любого персонажа.':
    'The preset can be selected in any character’s settings.',
  'Длина ответов, тон, формат действий, лексика, частота эмодзи...':
    'Response length, tone, action format, vocabulary, emoji frequency…',
  'Естественный ритм, конкретные формулировки и минимум ассистентского тона.':
    'Natural rhythm, specific wording, and minimal assistant-like tone.',
  'Без действий, ремарок, звёздочек и повествования от третьего лица.':
    'No actions, asides, asterisks, or third-person narration.',
  'Без эмодзи': 'No emoji',
  'Запрещает эмодзи, эмотиконы и декоративные символы.':
    'Disallows emoji, emoticons, and decorative symbols.',
  'От первого лица': 'First person',
  'Персонаж говорит от своего имени и не решает действия пользователя.':
    'The character speaks for themselves and does not decide the user’s actions.',
  Лаконичность: 'Conciseness',
  'Убирает повторы, лишние резюме и необязательные отступления.':
    'Removes repetition, unnecessary summaries, and optional digressions.',
  'Живой язык': 'Natural language',
  Инициативность: 'Initiative',
  'Позволяет персонажу двигать разговор вперёд без управления пользователем.':
    'Lets the character move the conversation forward without controlling the user.',
  Погружение: 'Immersion',
  'Поддерживает атмосферу сцены, детали мира и эмоциональную непрерывность.':
    'Preserves scene atmosphere, world details, and emotional continuity.',
  'Строгая непрерывность': 'Strict continuity',
  'Проверяет ответ на соответствие фактам, отношениям и текущей сцене.':
    'Checks the response against facts, relationships, and the current scene.',
  'Главное правило конфигурации': 'Primary configuration rule',
  'Важное ограничение': 'Important constraint',
  'Фоновая рекомендация': 'Background recommendation',
  'Стандартное правило': 'Standard rule',
  'Выбранные ограничения формата': 'Selected format constraints',
  'Можно выбрать несколько совместимых правил':
    'You can select multiple compatible rules',
  'Набор «Живой диалог»': '“Natural dialogue” set',
  'Сбросить правила': 'Reset rules',
  'Совмещайте правила, меняйте важность источников и добавляйте свои инструкции. Порядок можно менять перетаскиванием, а при конфликте более высокий приоритет побеждает.':
    'Combine rules, adjust source importance, and add custom instructions. Reorder them by dragging; higher priority wins in a conflict.',
  'Приоритет встроенных правил': 'Built-in rule priority',
  'Приоритет встроенных правил набора': 'Prompt set built-in rule priority',
  'Свои блоки ниже имеют отдельный приоритет.':
    'Custom blocks below have their own priority.',
  'Управляют порядком и силой частей системного промпта':
    'Controls the order and strength of system prompt parts',
  'Постоянные инструкции для конкретного чата':
    'Persistent instructions for a specific chat',
  'Пользовательских инструкций пока нет.': 'No custom instructions yet.',
  'Заполните название и инструкцию или выключите этот блок.':
    'Fill in the title and instruction, or disable this block.',
  'Опишите обязательное поведение, ограничения, формат или цель ответа.':
    'Describe required behavior, constraints, format, or response goal.',
  'Приоритет блока': 'Block priority',
  'Подключённые источники идут от фоновых к самым важным':
    'Connected sources are ordered from background to most important',
  'Активных источников пока нет. Выберите правила, набор или заполните свою инструкцию.':
    'There are no active sources yet. Select rules, a prompt set, or fill in a custom instruction.',
  'Подключённые наборы промптов': 'Connected prompt sets',
  'Подключённые наборы': 'Connected sets',
  'Наборы дополняют правила и блоки этого чата. Их можно переиспользовать у разных персонажей.':
    'Prompt sets extend this chat’s rules and blocks. They can be reused across characters.',
  'Подключённый набор пока пуст': 'The connected set is empty',
  'Создайте набор во вкладке «Наборы промптов», чтобы подключить его здесь.':
    'Create a set in Prompt sets to connect it here.',
  'Переиспользуемые правила подключаются ко всем чатам с этим персонажем.':
    'Reusable rules are connected to every chat with this character.',
  'Когда и для каких персонажей стоит использовать этот набор':
    'When and for which characters this set should be used',
  'Объединяет правила и свои блоки промпта в переиспользуемый набор с заданным порядком и приоритетами.':
    'Combines rules and custom prompt blocks into a reusable set with a defined order and priorities.',
  'Итог после подстановки имён вместо': 'Result after substituting names for',
  'Это именно тот порядок секций, который получит модель; переменные уже подставлены.':
    'This is the exact section order the model receives; variables have already been substituted.',
  'В промпте пока нет активных источников.':
    'There are no active sources in the prompt yet.',
  'Буфер обмена недоступен': 'Clipboard is unavailable',
  'Промпт скопирован': 'Prompt copied',
  'Не удалось скопировать промпт': 'Could not copy prompt',
  'Новый объект -': 'New object —',
  'Создать объект Галактики': 'Create Galaxy object',
  'Открыть редактор в текущем разделе библиотеки':
    'Open the editor in the current library section',
  'Удалить объект?': 'Delete object?',
  'Объект добавлен': 'Object added',
  'Объект обновлён': 'Object updated',
  'Объект удалён': 'Object deleted',
  'Экспорт Галактики': 'Export Galaxies',
  'Экспорт Галактик готов': 'Galaxies export is ready',
  'Импорт Галактик завершён': 'Galaxies import complete',
  'Не удалось экспортировать Галактики': 'Could not export Galaxies',
  'Не удалось импортировать Галактики': 'Could not import Galaxies',
  'Выбранный файл не является экспортом Галактик Galactrix':
    'The selected file is not a Galactrix Galaxies export',
  'Выбранный файл не является экспортом Телескопа Galactrix':
    'The selected file is not a Galactrix Telescope export',
  'Для выбранных персонажей связанные стили и наборы добавляются автоматически, чтобы импорт не потерял настройки.':
    'Linked styles and sets are added automatically for selected characters so their settings survive import.',
  'Персоны и персонажи': 'Personas and characters',
  'Нет персон и персонажей': 'No personas or characters',
  'Создайте персоны, персонажей и лор во вкладке «Галактики», чтобы подключать их к чатам.':
    'Create personas, characters, and lore in Galaxies to connect them to chats.',
  'Описывает пользователя: его устойчивые факты, привычки, предпочтения и особенности общения.':
    'Describes the user: stable facts, habits, preferences, and communication traits.',
  'Задаёт личность ассистента, подробное определение и постоянный стиль его сообщений.':
    'Defines the assistant’s identity, detailed definition, and persistent message style.',
  'Хранит правила мира, сеттинг и общие факты, действующие на протяжении всего чата.':
    'Stores world rules, setting, and shared facts that apply throughout the chat.',
  'Содержит отдельные записи лора, которые можно подключать к одному или нескольким чатам.':
    'Contains separate lore entries that can be connected to one or more chats.',
  'Сохраняет переиспользуемые инструкции по тону, формату и манере переписки персонажа.':
    'Stores reusable instructions for a character’s tone, format, and messaging style.',
  'Краткое описание пользователя, которое модель должна помнить':
    'A short user description for the model to remember',
  'Короткое описание персонажа': 'Short character description',
  'Краткое описание стиля переписки': 'Short messaging style description',
  'Общее описание мира и текущего сеттинга':
    'General description of the world and current setting',
  'Краткое назначение этого ворлдбука': 'Short purpose of this worldbook',
  'Стабильные сведения о {{user}}, которые не должны теряться между сообщениями.':
    'Stable information about {{user}} that must persist between messages.',
  'Сведения о {{user}}': 'Information about {{user}}',
  'Разделы объединяются по порядку в единое определение {{char}}.':
    'Sections are combined in order into a single definition of {{char}}.',
  'Личность и поведение {{char}}': 'Identity and behavior of {{char}}',
  'Факты из этих полей будут собраны в отдельный блок персоны.':
    'Facts from these fields are combined into a separate persona block.',
  'Привычки и устойчивое поведение': 'Habits and stable behavior',
  'Предпочтения, интересы и ограничения':
    'Preferences, interests, and boundaries',
  'Как персонаж должен общаться с пользователем':
    'How the character should communicate with the user',
  'Любые устойчивые факты: профессия, характер, любимые темы, ограничения и другое.':
    'Any stable facts: occupation, personality, favorite topics, boundaries, and more.',
  'Дополнительных параметров пока нет.': 'No additional attributes yet.',
  Параметр: 'Attribute',
  Значение: 'Value',
  'Удалить параметр': 'Delete attribute',
  мужчина: 'man',
  женщина: 'woman',
  мужской: 'male',
  женский: 'female',
  'он/его': 'he/him',
  'она/её': 'she/her',
  'Например, 25': 'For example, 25',
  'Оставьте пустым, чтобы не менять': 'Leave empty to keep unchanged',
  'Законы и факты мира': 'World rules and facts',
  'Опишите физику мира, эпоху, фракции, ограничения и важные правила.':
    'Describe the world’s physics, era, factions, constraints, and important rules.',
  'Добавьте первую запись определения.': 'Add the first definition entry.',
  'Добавьте первую запись ворлдбука.': 'Add the first worldbook entry.',
  'Включить запись': 'Enable entry',
  'Включённые записи передаются модели вместе с остальным контекстом чата.':
    'Enabled entries are sent to the model with the rest of the chat context.',
  'Ключевые слова записи': 'Entry keywords',
  'Есть пример': 'Has example',
  'Необязательный пример сообщения в этом стиле':
    'Optional example message in this style',
  'Только инструкции': 'Instructions only',
  'Только реплики': 'Dialogue only',
  'Фрагмент кода': 'Code snippet',
  'Разделы Галактики': 'Galaxy sections',
  'Разделы профиля': 'Profile sections',
  'Сообщения, отмеченные как важные': 'Messages marked as important',
  'Приложение запущено без Tauri backend':
    'The app is running without the Tauri backend',
  'Не удалось открыть данные': 'Could not open data',
  'свайп влево': 'swipe left',
  'можно отправлять запросы': 'ready to send requests',
  'готовы к подключению к чатам': 'ready to connect to chats',
  'нужно добавить провайдера': 'a provider must be added',
  сейчас: 'now',
  давно: 'long ago',
  Пн: 'Mon',
  Вт: 'Tue',
  Ср: 'Wed',
  Чт: 'Thu',
  Пт: 'Fri',
  Сб: 'Sat',
  Вс: 'Sun',
  'Сколько контекста уже подготовлено для общения.':
    'How much context is already prepared for conversation.',
  'Настроено моделей': 'Configured models',
  'Сохранено ключей': 'Saved keys',
  'Запросы к моделям': 'Model requests',
  'Средняя длина чата': 'Average chat length',
  'В среднем': 'Average',
  'нет запросов': 'no requests',
  'первые данные за период': 'first data for the period',
  'без изменений': 'no change',
  '% к прошлой неделе': '% vs previous week',
  '% приходится на ответы': '% used for responses',
  '/ запрос': '/ request',
};
