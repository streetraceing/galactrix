import {
  Button,
  Chip,
  Input,
  Label,
  ListBox,
  Select,
  Surface,
} from '@heroui/react';
import { useMemo, useState } from 'react';
import type { ChangeEvent, Key, ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { UiModal } from '../components/UiModal';
import { providerCatalog } from '../data';
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </div>
  );
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

  const resetModal = () => {
    setStep(1);
    setToken('');
    setModels([]);
    setLatency(null);
    setError('');
  };

  const close = () => {
    if (saving || loadingModels) return;
    setModalOpen(false);
    resetModal();
  };

  const openCreate = () => {
    setForm(defaultInput('mistral'));
    resetModal();
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
      resetModal();
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
      resetModal();
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
        // Проверяем остальные подключения независимо.
      }
    }
    setCheckingAll(false);
  };

  return (
    <div className="app-page-scroll scrollbar-thin">
      <div className="app-page-container">
        <header className="app-page-header">
          <div>
            <h1 className="app-page-title">Телескоп</h1>
            <p className="app-page-description">
              Подключения, модели и параметры генерации.
            </p>
          </div>
          <Button variant="primary" onPress={openCreate}>
            <Icon name="plus" className="size-4" /> Добавить
          </Button>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ['Доступны', connectedCount],
            ['Всего подключений', providers.length],
            [
              'Настроено моделей',
              providers.filter((provider) => provider.model).length,
            ],
          ].map(([label, value]) => (
            <Surface key={label} variant="secondary" className="p-5">
              <span className="text-sm app-muted">{label}</span>
              <strong className="mt-2 block text-2xl font-semibold">
                {value}
              </strong>
            </Surface>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Подключения</h2>
            <p className="mt-1 text-xs app-muted">
              Статус отражает последнюю фактическую проверку API.
            </p>
          </div>
          {providers.length > 0 && (
            <Button
              variant="secondary"
              isPending={checkingAll}
              onPress={() => void checkAll()}
            >
              <Icon name="refresh" className="size-4" /> Проверить все
            </Button>
          )}
        </div>

        {providers.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {providers.map((provider) => (
              <Surface
                key={provider.id}
                variant="secondary"
                className="flex items-center gap-3 p-4"
              >
                <div className="app-accent-tile grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold">
                  {provider.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-medium">{provider.name}</h3>
                    <Chip
                      size="sm"
                      variant="soft"
                      color={
                        provider.status === 'connected'
                          ? 'success'
                          : provider.status === 'error'
                            ? 'danger'
                            : 'default'
                      }
                    >
                      {statusLabels[provider.status]}
                    </Chip>
                  </div>
                  <p className="mt-1 truncate text-sm app-muted">
                    {provider.model}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs app-muted">
                    <span>
                      {provider.hasSecret
                        ? 'Ключ сохранён'
                        : 'Ключ не сохранён'}
                    </span>
                    <span>
                      {provider.latencyMs != null
                        ? `${provider.latencyMs} мс`
                        : 'Задержка неизвестна'}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    isPending={checkingId === provider.id}
                    aria-label="Проверить подключение"
                    onPress={() => void checkOne(provider.id)}
                  >
                    <Icon name="refresh" className="size-4" />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label="Редактировать подключение"
                    onPress={() => openEdit(provider)}
                  >
                    <Icon name="settings" className="size-4" />
                  </Button>
                </div>
              </Surface>
            ))}
          </div>
        ) : (
          <Surface variant="secondary" className="mt-6 p-8 text-center">
            <h2 className="text-lg font-semibold">Нет подключений</h2>
            <p className="mt-2 text-sm app-muted">
              Добавьте провайдера и загрузите доступные модели из его API.
            </p>
            <Button className="mt-5" variant="primary" onPress={openCreate}>
              <Icon name="plus" className="size-4" /> Добавить подключение
            </Button>
          </Surface>
        )}
      </div>

      <UiModal
        isOpen={modalOpen}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        size="lg"
        title={
          step === 1
            ? 'Новое подключение'
            : form.id
              ? 'Настройки подключения'
              : selectedCatalog.name
        }
        description={
          step === 1 ? 'Выберите тип API.' : selectedCatalog.description
        }
        footer={
          step === 2 ? (
            <>
              {form.id && (
                <Button
                  variant="danger"
                  isPending={saving}
                  onPress={() => void remove()}
                >
                  Удалить
                </Button>
              )}
              <span className="flex-1" />
              {!form.id && (
                <Button
                  variant="ghost"
                  isDisabled={saving}
                  onPress={() => setStep(1)}
                >
                  Назад
                </Button>
              )}
              <Button
                variant="primary"
                isPending={saving}
                isDisabled={
                  !form.name.trim() ||
                  !form.model.trim() ||
                  form.kind === 'character-ai'
                }
                onPress={() => void save()}
              >
                Сохранить
              </Button>
            </>
          ) : undefined
        }
      >
        {step === 1 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {providerCatalog.map((provider) => (
              <Button
                key={provider.kind}
                variant="ghost"
                className="h-auto items-start justify-start gap-3 px-3 py-4 text-left"
                onPress={() => chooseKind(provider.kind)}
              >
                <span className="app-accent-tile grid size-10 shrink-0 place-items-center rounded-xl text-xs font-semibold">
                  {provider.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-medium">
                    {provider.name}
                  </strong>
                  <span className="mt-1 block text-xs leading-5 app-muted">
                    {provider.description}
                  </span>
                </span>
                <Icon
                  name="chevron"
                  className="mt-1 size-4 shrink-0 app-muted"
                />
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {form.kind === 'character-ai' && (
              <Surface variant="tertiary" className="p-4 text-sm leading-6">
                <span className="app-warning">
                  Для Character.AI нужен отдельный адаптер авторизации и
                  протокола. Несовместимое подключение не сохраняется.
                </span>
              </Surface>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Название">
                <Input
                  fullWidth
                  variant="secondary"
                  value={form.name}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    patch('name', event.target.value)
                  }
                />
              </Field>
              <Field label="API-ключ">
                <Input
                  fullWidth
                  variant="secondary"
                  type="password"
                  value={token}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setToken(event.target.value)
                  }
                  placeholder={
                    form.id
                      ? 'Оставьте пустым, чтобы не менять'
                      : selectedCatalog.requiresApiKey
                        ? 'Обязателен'
                        : 'Необязательно'
                  }
                />
              </Field>
            </div>

            {(form.kind === 'custom' || form.kind === 'ollama-cloud') && (
              <Field label="Base URL">
                <Input
                  fullWidth
                  variant="secondary"
                  value={form.baseUrl ?? ''}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    patch('baseUrl', event.target.value)
                  }
                  placeholder="https://host.example/v1"
                />
              </Field>
            )}

            {selectedCatalog.requiresAccountId && (
              <Field label="Cloudflare Account ID">
                <Input
                  fullWidth
                  variant="secondary"
                  value={form.accountId ?? ''}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    patch('accountId', event.target.value)
                  }
                />
              </Field>
            )}

            {form.kind !== 'character-ai' && (
              <Surface variant="secondary" className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <strong className="text-sm font-medium">Модель</strong>
                    <p className="mt-1 text-xs app-muted">
                      {latency != null
                        ? `API ответил за ${latency} мс`
                        : 'Список ещё не загружен'}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    isPending={loadingModels}
                    onPress={() => void loadModels()}
                  >
                    <Icon name="refresh" className="size-4" /> Получить модели
                  </Button>
                </div>

                {models.length > 0 && (
                  <Select
                    className="mt-4"
                    fullWidth
                    variant="secondary"
                    value={models.includes(form.model) ? form.model : null}
                    onChange={(value: Key | Key[] | null) =>
                      patch('model', String(value ?? ''))
                    }
                    placeholder="Выберите модель"
                    aria-label="Доступные модели"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {models.map((model) => (
                          <ListBox.Item
                            id={model}
                            key={model}
                            textValue={model}
                          >
                            <Label>{model}</Label>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}

                <div className="mt-4">
                  <Field label="Идентификатор модели">
                    <Input
                      fullWidth
                      variant="secondary"
                      value={form.model}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        patch('model', event.target.value)
                      }
                      placeholder="Можно указать вручную"
                    />
                  </Field>
                </div>
              </Surface>
            )}

            <Surface variant="secondary" className="p-4">
              <strong className="text-sm font-medium">
                Параметры генерации
              </strong>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Temperature">
                  <Input
                    fullWidth
                    variant="secondary"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={String(form.temperature)}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      patch('temperature', Number(event.target.value))
                    }
                  />
                </Field>
                <Field label="Top P">
                  <Input
                    fullWidth
                    variant="secondary"
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={String(form.topP)}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      patch('topP', Number(event.target.value))
                    }
                  />
                </Field>
                <Field label="Max tokens">
                  <Input
                    fullWidth
                    variant="secondary"
                    type="number"
                    min="1"
                    value={String(form.maxTokens)}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      patch('maxTokens', Number(event.target.value))
                    }
                  />
                </Field>
              </div>
            </Surface>

            {error && (
              <p className="allow-selection text-sm app-danger">{error}</p>
            )}
          </div>
        )}
      </UiModal>
    </div>
  );
}
