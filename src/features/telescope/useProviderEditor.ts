import { useMemo, useState } from 'react';
import { toast } from '../../i18n/toast';
import type {
  Provider,
  ProviderInput,
  ProviderKind,
  ProviderModelResult,
} from '../../types';
import { providerCatalog } from './catalog';
import { defaultProviderInput, providerToInput } from './providerHelpers';

export function useProviderEditor({
  onFetchModels,
  onSave,
}: {
  onFetchModels: (
    provider: ProviderInput,
    apiKey?: string,
  ) => Promise<ProviderModelResult>;
  onSave: (provider: ProviderInput, apiKey?: string) => Promise<Provider>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<ProviderInput>(
    defaultProviderInput('mistral'),
  );
  const [token, setToken] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [latency, setLatency] = useState<number | null>(null);

  const catalog = useMemo(
    () => providerCatalog.find((entry) => entry.kind === form.kind)!,
    [form.kind],
  );

  const resetTransient = () => {
    setToken('');
    setModels([]);
    setLatency(null);
    setError('');
  };

  const openCreate = () => {
    setForm(defaultProviderInput('mistral'));
    setStep(1);
    resetTransient();
    setIsOpen(true);
  };

  const openEdit = (provider: Provider) => {
    setForm(providerToInput(provider));
    setStep(2);
    setToken('');
    setModels(provider.model ? [provider.model] : []);
    setLatency(provider.latencyMs ?? null);
    setError('');
    setIsOpen(true);
  };

  const close = () => {
    if (saving || loadingModels) return;
    setIsOpen(false);
    setStep(1);
    resetTransient();
  };

  const chooseKind = (kind: ProviderKind) => {
    setForm(defaultProviderInput(kind));
    setStep(2);
    resetTransient();
  };

  const patch = <K extends keyof ProviderInput>(
    key: K,
    value: ProviderInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const loadModels = async () => {
    if (loadingModels || !catalog.supportsAutomaticModels) return;
    setLoadingModels(true);
    setError('');
    try {
      const result = await onFetchModels(form, token.trim() || undefined);
      setModels(result.models);
      setLatency(result.latencyMs);
      if (!form.model && result.models.length > 0)
        patch('model', result.models[0]);
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
      const saved = await onSave(
        {
          ...form,
          name: form.name.trim(),
          model: form.model.trim(),
          baseUrl: form.baseUrl?.trim() || undefined,
          accountId: form.accountId?.trim() || undefined,
        },
        token.trim() || undefined,
      );
      toast.success(`«${saved.name}» сохранено`, {
        description: saved.model,
      });
      setIsOpen(false);
      setStep(1);
      resetTransient();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  };

  return {
    isOpen,
    step,
    form,
    token,
    models,
    loadingModels,
    saving,
    error,
    latency,
    catalog,
    setToken,
    setStep,
    patch,
    openCreate,
    openEdit,
    close,
    chooseKind,
    loadModels,
    save,
  };
}
