import { useMemo, useState } from 'react';
import { providerCatalog } from '../data';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import type {
  Provider,
  ProviderInput,
  ProviderKind,
  ProviderModelResult,
} from '../types';

const statusLabels = {
  connected: 'Доступен',
  disabled: 'Не проверен',
  error: 'Ошибка',
} as const;

function defaultInput(kind: ProviderKind): ProviderInput {
  const catalog = providerCatalog.find((entry) => entry.kind === kind)!;
  return {
    name: catalog.name,
    kind,
    model: '',
    baseUrl: catalog.defaultBaseUrl,
    temperature: 0.7,
    topP: 0.95,
    maxTokens: 4096,
  };
}

function providerToInput(provider: Provider): ProviderInput {
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    model: provider.model,
    baseUrl: provider.baseUrl,
    accountId: provider.accountId,
    temperature: provider.temperature,
    topP: provider.topP,
    maxTokens: provider.maxTokens,
  };
}

export function TelescopeScreen({
  providers,
  onFetchModels,
  onSave,
  onCheck,
  onDelete,
}: {
  providers: Provider[];
  onFetchModels: (
    provider: ProviderInput,
    apiKey?: string,
  ) => Promise<ProviderModelResult>;
  onSave: (provider: ProviderInput, apiKey?: string) => Promise<Provider>;
  onCheck: (id: string) => Promise<Provider>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<ProviderInput>(defaultInput('mistral'));
  const [token, setToken] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingId, setCheckingId] = useState('');
  const [error, setError] = useState('');
  const [latency, setLatency] = useState<number | null>(null);

  const selectedCatalog = useMemo(
    () => providerCatalog.find((entry) => entry.kind === form.kind)!,
    [form.kind],
  );

  const connectedCount = providers.filter(
    (provider) => provider.status === 'connected',
  ).length;

  const close = () => {
    if (saving || loadingModels) return;
    setModalOpen(false);
    setStep(1);
    setToken('');
    setModels([]);
    setLatency(null);
    setError('');
  };

  const openCreate = () => {
    setForm(defaultInput('mistral'));
    setToken('');
    setModels([]);
    setLatency(null);
    setError('');
    setStep(1);
    setModalOpen(true);
  };

  const chooseKind = (kind: ProviderKind) => {
    setForm(defaultInput(kind));
    setToken('');
    setModels([]);
    setLatency(null);
    setError('');
    setStep(2);
  };

  const openEdit = (provider: Provider) => {
    setForm(providerToInput(provider));
    setToken('');
    setModels(provider.model ? [provider.model] : []);
    setLatency(provider.latencyMs ?? null);
    setError('');
    setStep(2);
    setModalOpen(true);
  };

  const patch = <K extends keyof ProviderInput>(
    key: K,
    value: ProviderInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const loadModels = async () => {
    if (loadingModels || !selectedCatalog.supportsAutomaticModels) return;
    setLoadingModels(true);
    setError('');
    try {
      const result = await onFetchModels(form, token.trim() || undefined);
      setModels(result.models);
      setLatency(result.latencyMs);
      if (!form.model && result.models.length > 0) {
        patch('model', result.models[0]);
      }
    } catch (caught) {
      setModels([]);
      setLatency(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoadingModels(false);
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.model.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave(
        {
          ...form,
          name: form.name.trim(),
          model: form.model.trim(),
          baseUrl: form.baseUrl?.trim() || undefined,
          accountId: form.accountId?.trim() || undefined,
        },
        token.trim() || undefined,
      );
      setModalOpen(false);
      setStep(1);
      setToken('');
      setModels([]);
      setLatency(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!form.id || saving) return;
    setSaving(true);
    setError('');
    try {
      await onDelete(form.id);
      setModalOpen(false);
      setStep(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  };

  const checkOne = async (id: string) => {
    setCheckingId(id);
    try {
      await onCheck(id);
    } catch {
      // Статус ошибки сохраняется backend-ом и появится после refresh.
    } finally {
      setCheckingId('');
    }
  };

  const checkAll = async () => {
    if (checkingAll) return;
    setCheckingAll(true);
    for (const provider of providers) {
      try {
        await onCheck(provider.id);
      } catch {
        // Продолжаем проверку остальных подключений.
      }
    }
    setCheckingAll(false);
  };

  return (
    <div className="screen-scroll scroll-area">
      <header className="page-header">
        <div>
          <h1>Телескоп</h1>
          <p>Подключения, модели и параметры генерации.</p>
        </div>
        <button className="primary-button" onClick={openCreate}>
          <Icon name="plus" /> Добавить
        </button>
      </header>

      <div className="metric-grid compact-metrics">
        <article className="metric-card">
          <span>Доступны</span>
          <strong>{connectedCount}</strong>
        </article>
        <article className="metric-card">
          <span>Всего подключений</span>
          <strong>{providers.length}</strong>
        </article>
        <article className="metric-card">
          <span>Настроено моделей</span>
          <strong>
            {providers.filter((provider) => provider.model).length}
          </strong>
        </article>
      </div>

      <section className="section-block">
        <div className="section-title">
          <div>
            <h2>Подключения</h2>
            <p>Статус и задержка отражают последнюю реальную проверку API.</p>
          </div>
          {providers.length > 0 && (
            <button
              className="ghost-button"
              onClick={() => void checkAll()}
              disabled={checkingAll}
            >
              <Icon name="refresh" />{' '}
              {checkingAll ? 'Проверка…' : 'Проверить все'}
            </button>
          )}
        </div>

        {providers.length > 0 ? (
          <div className="provider-list">
            {providers.map((provider) => (
              <article className="provider-card" key={provider.id}>
                <div className="provider-mark">
                  {provider.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="provider-info">
                  <div className="provider-title">
                    <h3>{provider.name}</h3>
                    <span className={`provider-status ${provider.status}`}>
                      {statusLabels[provider.status]}
                    </span>
                  </div>
                  <p>{provider.model}</p>
                  <div className="provider-details">
                    <span>
                      {provider.hasSecret
                        ? 'Ключ сохранён'
                        : 'Без сохранённого ключа'}
                    </span>
                    <span>
                      {provider.latencyMs != null
                        ? `${provider.latencyMs} мс`
                        : 'задержка неизвестна'}
                    </span>
                  </div>
                </div>
                <div className="provider-actions">
                  <button
                    className="icon-button"
                    onClick={() => void checkOne(provider.id)}
                    disabled={checkingId === provider.id}
                    aria-label="Проверить подключение"
                  >
                    <Icon name="refresh" />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => openEdit(provider)}
                    aria-label="Редактировать подключение"
                  >
                    <Icon name="settings" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state page-empty">
            <h2>Нет подключений</h2>
            <p>
              Добавьте провайдера и получите список моделей напрямую из его API.
            </p>
            <button className="primary-button" onClick={openCreate}>
              <Icon name="plus" /> Добавить подключение
            </button>
          </div>
        )}
      </section>

      {modalOpen && (
        <Modal
          title={
            step === 1
              ? 'Новое подключение'
              : form.id
                ? 'Настройки подключения'
                : selectedCatalog.name
          }
          subtitle={
            step === 2 ? selectedCatalog.description : 'Выберите тип API'
          }
          onClose={close}
          footer={
            step === 2 ? (
              <>
                {form.id && (
                  <button
                    className="danger-button"
                    onClick={() => void remove()}
                    disabled={saving}
                  >
                    Удалить
                  </button>
                )}
                <span className="modal-footer-spacer" />
                {!form.id && (
                  <button
                    className="ghost-button"
                    onClick={() => setStep(1)}
                    disabled={saving}
                  >
                    Назад
                  </button>
                )}
                <button
                  className="primary-button"
                  disabled={
                    !form.name.trim() ||
                    !form.model.trim() ||
                    saving ||
                    form.kind === 'character-ai'
                  }
                  onClick={() => void save()}
                >
                  {saving ? 'Проверка…' : 'Сохранить'}
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
                  <span className="provider-mark">
                    {provider.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    <strong>{provider.name}</strong>
                    <small>{provider.description}</small>
                  </span>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
          ) : (
            <div className="provider-form">
              {form.kind === 'character-ai' && (
                <div className="inline-warning">
                  Character.AI не предоставляет совместимый публичный API. Для
                  него нужен отдельный адаптер с собственной авторизацией;
                  ложное подключение не создаётся.
                </div>
              )}

              <div className="form-row">
                <label className="form-field">
                  <span>Название</span>
                  <input
                    value={form.name}
                    onChange={(event) => patch('name', event.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>API-ключ</span>
                  <input
                    type="password"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder={
                      form.id
                        ? 'Оставьте пустым, чтобы не менять'
                        : selectedCatalog.requiresApiKey
                          ? 'Обязателен'
                          : 'Необязательно'
                    }
                  />
                </label>
              </div>

              {(form.kind === 'custom' || form.kind === 'ollama-cloud') && (
                <label className="form-field">
                  <span>Base URL</span>
                  <input
                    value={form.baseUrl ?? ''}
                    onChange={(event) => patch('baseUrl', event.target.value)}
                    placeholder="https://host.example/v1"
                  />
                </label>
              )}

              {selectedCatalog.requiresAccountId && (
                <label className="form-field">
                  <span>Cloudflare Account ID</span>
                  <input
                    value={form.accountId ?? ''}
                    onChange={(event) => patch('accountId', event.target.value)}
                  />
                </label>
              )}

              {form.kind !== 'character-ai' && (
                <div className="models-box">
                  <div className="models-box-heading">
                    <div>
                      <strong>Модель</strong>
                      <small>
                        {latency != null
                          ? `API ответил за ${latency} мс`
                          : 'Список ещё не загружен'}
                      </small>
                    </div>
                    <button
                      className="secondary-button"
                      onClick={() => void loadModels()}
                      disabled={loadingModels}
                    >
                      <Icon name="refresh" />{' '}
                      {loadingModels ? 'Загрузка…' : 'Получить модели'}
                    </button>
                  </div>

                  {models.length > 0 && (
                    <label className="form-field">
                      <span>Доступные модели</span>
                      <select
                        value={models.includes(form.model) ? form.model : ''}
                        onChange={(event) => patch('model', event.target.value)}
                      >
                        <option value="">Выберите модель</option>
                        {models.map((model) => (
                          <option value={model} key={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="form-field">
                    <span>Идентификатор модели</span>
                    <input
                      value={form.model}
                      onChange={(event) => patch('model', event.target.value)}
                      placeholder="Можно указать вручную"
                    />
                  </label>
                </div>
              )}

              <details className="advanced-settings">
                <summary>
                  Параметры генерации <Icon name="chevron" />
                </summary>
                <div className="range-grid">
                  <label>
                    <span>
                      Temperature <b>{form.temperature}</b>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={form.temperature}
                      onChange={(event) =>
                        patch('temperature', Number(event.target.value))
                      }
                    />
                  </label>
                  <label>
                    <span>
                      Top P <b>{form.topP}</b>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={form.topP}
                      onChange={(event) =>
                        patch('topP', Number(event.target.value))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Max tokens</span>
                    <input
                      type="number"
                      min="1"
                      value={form.maxTokens}
                      onChange={(event) =>
                        patch('maxTokens', Number(event.target.value))
                      }
                    />
                  </label>
                </div>
              </details>

              {error && <div className="inline-error">{error}</div>}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
