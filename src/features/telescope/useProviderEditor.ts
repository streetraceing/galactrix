import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../../i18n/toast';
import type {
  EmbeddingProbeResult,
  Provider,
  ProviderInput,
  ProviderKind,
  ProviderModelResult,
} from '../../types';
import { providerCatalog } from './catalog';
import { defaultProviderInput, providerToInput } from './providerHelpers';

export function useProviderEditor({
  onFetchModels,
  onTestEmbeddings,
  onSave,
}: {
  onFetchModels: (
    provider: ProviderInput,
    apiKey?: string,
  ) => Promise<ProviderModelResult>;
  onTestEmbeddings: (
    provider: ProviderInput,
    apiKey?: string,
  ) => Promise<EmbeddingProbeResult>;
  onSave: (provider: ProviderInput, apiKey?: string) => Promise<Provider>;
}) {
  const { t } = useTranslation('telescope');
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<ProviderInput>(
    defaultProviderInput('mistral'),
  );
  const [token, setToken] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingEmbeddings, setTestingEmbeddings] = useState(false);
  const [embeddingProbe, setEmbeddingProbe] =
    useState<EmbeddingProbeResult | null>(null);
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
    setEmbeddingProbe(null);
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
    setEmbeddingProbe(null);
    setError('');
    setIsOpen(true);
  };

  const close = () => {
    if (saving || loadingModels || testingEmbeddings) return;
    setIsOpen(false);
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

  const testEmbeddings = async () => {
    if (testingEmbeddings || !form.embeddingModel?.trim()) return;
    setTestingEmbeddings(true);
    setEmbeddingProbe(null);
    setError('');
    try {
      const result = await onTestEmbeddings(form, token.trim() || undefined);
      setEmbeddingProbe(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setTestingEmbeddings(false);
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
          embeddingModel:
            form.embeddingModel === undefined
              ? undefined
              : form.embeddingModel.trim(),
          embeddingBaseUrl: form.embeddingBaseUrl?.trim() || undefined,
        },
        token.trim() || undefined,
      );
      toast.success(t('toast.connectionSaved', { name: saved.name }), {
        description: saved.model,
      });
      setIsOpen(false);
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
    testingEmbeddings,
    embeddingProbe,
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
    testEmbeddings,
    save,
  };
}
