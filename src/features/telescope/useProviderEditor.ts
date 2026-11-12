import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../../i18n/toast';
import { errorMessage } from '../../lib/errors';
import type {
  EmbeddingProbeResult,
  Provider,
  ProviderInput,
  ProviderKind,
  ProviderModelResult,
} from '../../types';
import { parseProviderOptions } from './providerOptions';
import { providerCatalog } from './catalog';
import { defaultProviderInput, providerToInput } from './providerHelpers';
import { createEditorEpoch } from './editorEpoch';

export function useProviderEditor({
  onFetchModels,
  onTestEmbeddings,
  onSave,
  onReadSecrets,
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
  onReadSecrets: (providerId: string) => Promise<string>;
}) {
  const { t } = useTranslation('telescope');
  const epoch = useRef(createEditorEpoch()).current;
  const tokenEdited = useRef(false);
  useEffect(
    () => () => {
      epoch.begin();
    },
    [epoch],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<ProviderInput>(
    defaultProviderInput('mistral'),
  );
  const [token, setTokenState] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
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
    tokenEdited.current = false;
    setTokenState('');
    setModels([]);
    setLatency(null);
    setEmbeddingProbe(null);
    setError('');
    setLoadingCredentials(false);
    setLoadingModels(false);
    setTestingEmbeddings(false);
    setSaving(false);
  };
  const invalidateEdits = () => {
    epoch.edit();
    setEmbeddingProbe(null);
    setLatency(null);
    setError('');
    setLoadingModels(false);
    setTestingEmbeddings(false);
  };
  const openCreate = () => {
    epoch.begin();
    resetTransient();
    setForm(defaultProviderInput('mistral'));
    setStep(1);
    setIsOpen(true);
  };
  const openEdit = async (provider: Provider) => {
    epoch.begin();
    resetTransient();
    const ticket = epoch.snapshot();
    setForm(providerToInput(provider));
    setStep(2);
    setIsOpen(true);
    setModels(provider.model ? [provider.model] : []);
    setLatency(provider.latencyMs ?? null);
    setLoadingCredentials(true);
    try {
      const secret = await onReadSecrets(provider.id);
      if (epoch.isCurrent(ticket)) setTokenState(secret);
    } catch (caught) {
      if (epoch.isCurrent(ticket)) setError(errorMessage(caught));
    } finally {
      if (epoch.isSession(ticket)) setLoadingCredentials(false);
    }
  };
  const close = () => {
    if (saving) return;
    epoch.begin();
    resetTransient();
    setIsOpen(false);
  };
  const chooseKind = (kind: ProviderKind) => {
    epoch.begin();
    resetTransient();
    setForm(defaultProviderInput(kind));
    setStep(2);
  };
  const patch = <K extends keyof ProviderInput>(
    key: K,
    value: ProviderInput[K],
  ) => {
    invalidateEdits();
    setForm((current) => ({ ...current, [key]: value }));
  };
  const setToken = (value: string) => {
    invalidateEdits();
    tokenEdited.current = true;
    setTokenState(value);
    setModels([]);
  };
  // Undefined keeps stored credentials. An explicitly edited empty field deletes them.
  const requestKey = () => (tokenEdited.current ? token.trim() : undefined);
  const loadModels = async () => {
    if (
      loadingModels ||
      loadingCredentials ||
      saving ||
      !catalog.supportsAutomaticModels
    )
      return;
    const ticket = epoch.snapshot();
    setLoadingModels(true);
    setError('');
    try {
      const result = await onFetchModels(form, requestKey());
      if (!epoch.isCurrent(ticket)) return;
      setModels(result.models);
      setLatency(result.latencyMs);
      if (!form.model && result.models.length > 0)
        setForm((current) => ({ ...current, model: result.models[0] }));
    } catch (caught) {
      if (epoch.isCurrent(ticket)) {
        setModels([]);
        setLatency(null);
        setError(errorMessage(caught));
      }
    } finally {
      if (epoch.isCurrent(ticket)) setLoadingModels(false);
    }
  };
  const testEmbeddings = async () => {
    if (
      testingEmbeddings ||
      loadingCredentials ||
      saving ||
      !form.embeddingModel?.trim()
    )
      return;
    const ticket = epoch.snapshot();
    setTestingEmbeddings(true);
    setEmbeddingProbe(null);
    setError('');
    try {
      const result = await onTestEmbeddings(form, requestKey());
      if (epoch.isCurrent(ticket)) setEmbeddingProbe(result);
    } catch (caught) {
      if (epoch.isCurrent(ticket)) setError(errorMessage(caught));
    } finally {
      if (epoch.isCurrent(ticket)) setTestingEmbeddings(false);
    }
  };
  const save = async () => {
    if (!form.name.trim() || !form.model.trim() || saving || loadingCredentials)
      return;
    const ticket = epoch.snapshot();
    setSaving(true);
    setError('');
    try {
      let options;
      try {
        options = parseProviderOptions(form.options);
      } catch {
        throw new Error(t('advanced.invalidOptions'));
      }
      const saved = await onSave(
        {
          ...form,
          options,
          name: form.name.trim(),
          model: form.model.trim(),
          baseUrl: form.baseUrl?.trim() || undefined,
          accountId: form.accountId?.trim() || undefined,
          embeddingModel:
            form.embeddingModel == null
              ? undefined
              : form.embeddingModel.trim(),
          embeddingBaseUrl: form.embeddingBaseUrl?.trim() || undefined,
        },
        requestKey(),
      );
      if (!epoch.isCurrent(ticket)) return;
      toast.success(t('toast.connectionSaved', { name: saved.name }), {
        description: saved.model,
      });
      setIsOpen(false);
      epoch.begin();
      setSaving(false);
    } catch (caught) {
      if (epoch.isCurrent(ticket)) setError(errorMessage(caught));
    } finally {
      if (epoch.isSession(ticket)) setSaving(false);
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
    loadingCredentials,
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
