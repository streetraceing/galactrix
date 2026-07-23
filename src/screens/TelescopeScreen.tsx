import { useMemo, useState } from 'react';
import { providerCatalog } from '../data';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import type { Provider, ProviderKind } from '../types';

const modelExamples: Record<ProviderKind, string[]> = {
  mistral: [
    'mistral-large-latest',
    'mistral-medium-latest',
    'codestral-latest',
  ],
  'character-ai': ['character-ai-default'],
  cerebras: ['llama-3.3-70b', 'qwen-3-32b'],
  'nvidia-nim': ['meta/llama-3.3-70b-instruct', 'deepseek-ai/deepseek-r1'],
  'ollama-cloud': ['qwen3:32b', 'deepseek-r1:70b', 'gemma3:27b'],
  'cloudflare-workers-ai': [
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    '@cf/qwen/qwen2.5-coder-32b-instruct',
  ],
  custom: [],
};

export function TelescopeScreen({
  providers,
  onSave,
}: {
  providers: Provider[];
  onSave: (provider: Provider, apiKey?: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<ProviderKind>('mistral');
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const selectedCatalog = providerCatalog.find(
    (provider) => provider.kind === kind,
  )!;
  const availableModels = useMemo(() => modelExamples[kind], [kind]);

  const chooseKind = (value: ProviderKind) => {
    const catalog = providerCatalog.find(
      (provider) => provider.kind === value,
    )!;
    setKind(value);
    setName(catalog.name);
    setBaseUrl(catalog.defaultBaseUrl ?? '');
    setModel('');
    setModelsLoaded(false);
    setStep(2);
  };

  const close = () => {
    setModalOpen(false);
    setStep(1);
    setToken('');
    setAccountId('');
    setCustomModel('');
    setModelsLoaded(false);
  };

  const save = () => {
    const chosenModel = customModel.trim() || model;
    if (!name.trim() || !chosenModel) return;
    onSave(
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        kind,
        model: chosenModel,
        status: 'connected',
        baseUrl: baseUrl.trim() || undefined,
        accountId: accountId.trim() || undefined,
        latencyMs: 0,
      },
      token.trim() || undefined,
    );
    close();
  };

  return (
    <div className="screen-scroll scroll-area">
      <header className="page-header">
        <div>
          <span className="eyebrow">Технический центр</span>
          <h1>Телескоп</h1>
          <p>Провайдеры, авторизация, модели и тонкие параметры генерации.</p>
        </div>
        <button className="primary-button" onClick={() => setModalOpen(true)}>
          <Icon name="plus" /> Провайдер
        </button>
      </header>

      <div className="status-grid">
        <article className="status-card panel">
          <span className="status-icon success">
            <Icon name="check" />
          </span>
          <div>
            <strong>
              {
                providers.filter((provider) => provider.status === 'connected')
                  .length
              }
            </strong>
            <small>активных провайдера</small>
          </div>
        </article>
        <article className="status-card panel">
          <span className="status-icon">
            <Icon name="brain" />
          </span>
          <div>
            <strong>{providers.length + 4}</strong>
            <small>доступных моделей</small>
          </div>
        </article>
        <article className="status-card panel">
          <span className="status-icon">
            <Icon name="shield" />
          </span>
          <div>
            <strong>Secure</strong>
            <small>ключи вне SQLite</small>
          </div>
        </article>
      </div>

      <section className="section-block">
        <div className="section-title">
          <div>
            <h2>Подключения</h2>
            <p>
              Метаданные хранятся в SQLite, секреты — отдельно в защищённом
              хранилище.
            </p>
          </div>
          <button className="ghost-button">
            <Icon name="refresh" /> Проверить все
          </button>
        </div>
        <div className="provider-list">
          {providers.map((provider) => (
            <article className="provider-card panel" key={provider.id}>
              <div className={`provider-logo provider-${provider.kind}`}>
                {provider.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="provider-info">
                <div className="provider-title">
                  <h3>{provider.name}</h3>
                  <span className={`provider-status ${provider.status}`}>
                    {provider.status === 'connected'
                      ? 'Подключён'
                      : provider.status === 'disabled'
                        ? 'Выключен'
                        : 'Ошибка'}
                  </span>
                </div>
                <p>{provider.model}</p>
                <div className="provider-details">
                  <span>
                    <Icon name="key" /> ключ защищён
                  </span>
                  {provider.latencyMs ? (
                    <span>{provider.latencyMs} мс</span>
                  ) : (
                    <span>не проверялся</span>
                  )}
                </div>
              </div>
              <button className="icon-button" aria-label="Настройки провайдера">
                <Icon name="settings" />
              </button>
            </article>
          ))}
          <button
            className="provider-add-row"
            onClick={() => setModalOpen(true)}
          >
            <span>
              <Icon name="plus" />
            </span>
            <div>
              <strong>Добавить провайдера</strong>
              <small>Mistral, Cerebras, NVIDIA NIM, Cloudflare и другие</small>
            </div>
            <Icon name="chevron" />
          </button>
        </div>
      </section>

      <section className="security-banner panel">
        <span>
          <Icon name="shield" />
        </span>
        <div>
          <h3>Секреты отделены от данных приложения</h3>
          <p>
            API-ключи не должны попадать в SQLite, логи или экспорт чатов. На
            Android слой хранения можно связать с Keystore.
          </p>
        </div>
      </section>

      {modalOpen && (
        <Modal
          title={
            step === 1
              ? 'Выбери провайдера'
              : `Подключение: ${selectedCatalog.name}`
          }
          subtitle={
            step === 1
              ? 'Можно добавлять готовые адаптеры и OpenAI-совместимые endpoint-ы.'
              : selectedCatalog.note
          }
          onClose={close}
          footer={
            step === 2 ? (
              <>
                <button className="ghost-button" onClick={() => setStep(1)}>
                  Назад
                </button>
                <button
                  className="primary-button"
                  disabled={!model && !customModel.trim()}
                  onClick={save}
                >
                  Сохранить
                </button>
              </>
            ) : undefined
          }
        >
          {step === 1 ? (
            <div className="provider-picker">
              {providerCatalog.map((provider) => (
                <button
                  onClick={() => chooseKind(provider.kind)}
                  key={provider.kind}
                >
                  <span className={`provider-logo provider-${provider.kind}`}>
                    {provider.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    <strong>{provider.name}</strong>
                    <small>{provider.note}</small>
                  </span>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
          ) : (
            <div className="provider-form">
              <div className="form-row">
                <label className="form-field">
                  <span>Название подключения</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>API-токен / ключ</span>
                  <input
                    type="password"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="Будет сохранён защищённо"
                  />
                </label>
              </div>
              {selectedCatalog.requiresAccountId && (
                <label className="form-field">
                  <span>Cloudflare Account ID</span>
                  <input
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    placeholder="32-символьный Account ID"
                  />
                </label>
              )}
              {(kind === 'custom' || selectedCatalog.defaultBaseUrl) && (
                <label className="form-field">
                  <span>Base URL</span>
                  <input
                    value={baseUrl}
                    onChange={(event) => setBaseUrl(event.target.value)}
                    placeholder="https://api.example.com/v1"
                  />
                </label>
              )}
              <div className="models-box">
                <div className="models-box-heading">
                  <div>
                    <strong>Модели</strong>
                    <small>
                      В рабочей версии список загружается API-запросом через
                      Rust-адаптер.
                    </small>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => setModelsLoaded(true)}
                  >
                    <Icon name="refresh" /> Загрузить
                  </button>
                </div>
                {modelsLoaded ? (
                  <div className="model-options">
                    {availableModels.map((value) => (
                      <button
                        className={model === value ? 'selected' : ''}
                        onClick={() => {
                          setModel(value);
                          setCustomModel('');
                        }}
                        key={value}
                      >
                        <span>{value}</span>
                        {model === value && <Icon name="check" />}
                      </button>
                    ))}
                    {availableModels.length === 0 && (
                      <p className="muted-copy">
                        Провайдер не вернул список. Укажи модель вручную.
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    className="load-placeholder"
                    onClick={() => setModelsLoaded(true)}
                  >
                    <Icon name="refresh" /> Проверить токен и получить модели
                  </button>
                )}
                <label className="form-field">
                  <span>Кастомная модель</span>
                  <input
                    value={customModel}
                    onChange={(event) => {
                      setCustomModel(event.target.value);
                      if (event.target.value) setModel('');
                    }}
                    placeholder="Если нужной модели нет в списке"
                  />
                </label>
              </div>
              <details className="advanced-settings">
                <summary>
                  Тонкие настройки модели <Icon name="chevron" />
                </summary>
                <div className="range-grid">
                  <label>
                    <span>
                      Temperature <b>0.8</b>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      defaultValue="0.8"
                    />
                  </label>
                  <label>
                    <span>
                      Top P <b>0.95</b>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      defaultValue="0.95"
                    />
                  </label>
                  <label>
                    <span>Max tokens</span>
                    <input type="number" defaultValue="4096" />
                  </label>
                </div>
              </details>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
