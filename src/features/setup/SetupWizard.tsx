import { Button } from '@heroui/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AvatarPicker } from '../../components/ui/AvatarPicker';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppPanel } from '../../components/ui/AppPanel';
import { toast } from '../../i18n/toast';
import { errorMessage } from '../../lib/errors';
import type {
  AppSettings,
  EmbeddingProbeResult,
  Provider,
  ProviderInput,
  ProviderModelResult,
} from '../../types';
import { ProviderEditorModal } from '../telescope/components/ProviderEditorModal';
import { useProviderEditor } from '../telescope/useProviderEditor';
import { providerToInput } from '../telescope/providerHelpers';

type WizardStep = 1 | 2 | 3 | 4;

const LANGUAGE_CHOICES = [
  { value: 'system', labelKey: 'welcome.languageSystem' },
  { value: 'ru', labelKey: 'welcome.languageRussian' },
  { value: 'en', labelKey: 'welcome.languageEnglish' },
] as const;

function StepHeader({ step }: { step: WizardStep }) {
  const { t } = useTranslation('setup');
  return (
    <div
      className="flex items-center justify-center gap-2"
      aria-label={t('title')}
    >
      {([1, 2, 3, 4] as const).map((index) => (
        <span
          key={index}
          aria-hidden
          className={`h-1.5 rounded-full transition-all duration-(--motion-standard) ease-(--motion-ease) ${
            index === step
              ? 'w-8 bg-accent'
              : index < step
                ? 'w-4 bg-accent/40'
                : 'w-4 bg-default'
          }`}
        />
      ))}
    </div>
  );
}

function ChecklistRow({
  done,
  skipped,
  label,
  hint,
  actionLabel,
  onAction,
}: {
  done: boolean;
  skipped?: boolean;
  label: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-separator p-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon
          name={done ? 'check' : skipped ? 'info' : 'close'}
          className={`mt-0.5 size-4 shrink-0 ${
            done ? 'text-success' : skipped ? 'text-warning' : 'text-danger'
          }`}
        />
        <span className="min-w-0">
          <strong className="block text-sm">{label}</strong>
          {hint ? (
            <span className="mt-0.5 block text-xs leading-5 text-muted">
              {hint}
            </span>
          ) : null}
        </span>
      </div>
      {!done && actionLabel && onAction ? (
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0"
          onPress={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function SetupWizard({
  settings,
  providers,
  onChangeSettings,
  onFetchModels,
  onTestEmbeddings,
  onSaveProvider,
}: {
  settings: AppSettings;
  providers: Provider[];
  onChangeSettings: (settings: AppSettings) => Promise<boolean>;
  onFetchModels: (
    provider: ProviderInput,
    apiKey?: string,
  ) => Promise<ProviderModelResult>;
  onTestEmbeddings: (
    provider: ProviderInput,
    apiKey?: string,
  ) => Promise<EmbeddingProbeResult>;
  onSaveProvider: (
    provider: ProviderInput,
    apiKey?: string,
  ) => Promise<Provider>;
}) {
  const { t } = useTranslation('setup');
  const [step, setStep] = useState<WizardStep>(1);
  const [profileName, setProfileName] = useState(settings.profileName);
  const [profileAvatar, setProfileAvatar] = useState(settings.profileAvatar);
  const [language, setLanguage] = useState(settings.language);
  const [embeddingModel, setEmbeddingModel] = useState('');
  const [embeddingProviderId, setEmbeddingProviderId] = useState(
    providers[0]?.id ?? '',
  );
  const [testing, setTesting] = useState(false);
  const [probe, setProbe] = useState<EmbeddingProbeResult | null>(null);
  const [busy, setBusy] = useState(false);

  const editor = useProviderEditor({
    onFetchModels,
    onTestEmbeddings,
    onSave: async (input, apiKey) => {
      const saved = await onSaveProvider(input, apiKey);
      setEmbeddingProviderId(saved.id);
      setStep(3);
      return saved;
    },
    onReadSecrets: async () => '',
  });

  const embeddingsProvider = useMemo(
    () =>
      providers.find((provider) => provider.id === embeddingProviderId) ??
      providers[0],
    [embeddingProviderId, providers],
  );

  const saveWelcome = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onChangeSettings({
        ...settings,
        language,
        profileName: profileName.trim().slice(0, 80),
        profileAvatar: profileAvatar,
      });
      setStep(2);
    } catch (caught) {
      toast.danger(t('errors.actionFailed'), {
        description: errorMessage(caught),
      });
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onChangeSettings({ ...settings, setupComplete: true });
    } catch (caught) {
      toast.danger(t('errors.actionFailed'), {
        description: errorMessage(caught),
      });
    } finally {
      setBusy(false);
    }
  };

  const testEmbeddings = async () => {
    if (!embeddingsProvider || testing || !embeddingModel.trim()) return;
    setTesting(true);
    setProbe(null);
    try {
      const input = {
        ...providerToInput(embeddingsProvider),
        embeddingModel: embeddingModel.trim(),
      };
      const result = await onTestEmbeddings(input);
      setProbe(result);
    } catch (caught) {
      toast.danger(t('errors.actionFailed'), {
        description: errorMessage(caught),
      });
    } finally {
      setTesting(false);
    }
  };

  const enableEmbeddings = async () => {
    if (!embeddingsProvider || busy) return;
    setBusy(true);
    try {
      await onSaveProvider({
        ...providerToInput(embeddingsProvider),
        embeddingModel: embeddingModel.trim() || undefined,
      });
      await onChangeSettings({
        ...settings,
        aiModules: {
          ...settings.aiModules,
          semanticMemory: {
            ...settings.aiModules.semanticMemory,
            enabled: true,
            providerId: embeddingsProvider.id,
          },
        },
      });
      toast.success(t('embeddings.enabled'));
      setStep(4);
    } catch (caught) {
      toast.danger(t('errors.actionFailed'), {
        description: errorMessage(caught),
      });
    } finally {
      setBusy(false);
    }
  };

  const embeddingsEnabled = settings.aiModules.semanticMemory.enabled;

  return (
    <div className="page-scroll app-screen-enter flex-1">
      <div className="page-container mx-auto max-w-2xl">
        <PageHeader title={t('title')} description={t('description')} />
        <StepHeader step={step} />

        {step === 1 ? (
          <AppPanel className="p-4 sm:p-5">
            <h2 className="section-title">{t('welcome.title')}</h2>
            <p className="section-description">{t('welcome.description')}</p>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium">{t('welcome.language')}</p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {LANGUAGE_CHOICES.map((choice) => (
                    <Button
                      key={choice.value}
                      variant={
                        language === choice.value ? 'primary' : 'secondary'
                      }
                      fullWidth
                      onPress={() => setLanguage(choice.value)}
                    >
                      {t(choice.labelKey)}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">
                  {t('welcome.profileName')}
                </p>
                <input
                  value={profileName}
                  maxLength={80}
                  autoComplete="off"
                  placeholder={t('welcome.profileNamePlaceholder')}
                  onChange={(event) => setProfileName(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-separator bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
                />
              </div>
              <div>
                <p className="text-sm font-medium">{t('welcome.avatar')}</p>
                <div className="mt-2">
                  <AvatarPicker
                    value={profileAvatar}
                    name={profileName || 'Galactrix'}
                    onChange={setProfileAvatar}
                  />
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              className="mt-5"
              isPending={busy}
              onPress={() => void saveWelcome()}
            >
              {t('actions.continue')}
            </Button>
          </AppPanel>
        ) : null}

        {step === 2 ? (
          <AppPanel className="p-4 sm:p-5">
            <h2 className="section-title">{t('provider.title')}</h2>
            <p className="section-description">{t('provider.description')}</p>

            <div className="mt-4 space-y-2">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-separator p-3"
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">
                      {provider.name}
                    </strong>
                    <span className="block truncate text-xs text-muted">
                      {provider.model}
                    </span>
                  </span>
                  <Icon
                    name={provider.status === 'connected' ? 'check' : 'info'}
                    className={`size-4 shrink-0 ${
                      provider.status === 'connected'
                        ? 'text-success'
                        : 'text-warning'
                    }`}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="primary"
                fullWidth
                onPress={() => editor.openCreate()}
              >
                <Icon name="plus" className="size-4" />
                {t('provider.connect')}
              </Button>
              <Button variant="ghost" fullWidth onPress={() => setStep(3)}>
                {t('actions.skip')}
              </Button>
            </div>
          </AppPanel>
        ) : null}

        {step === 3 ? (
          <AppPanel className="p-4 sm:p-5">
            <h2 className="section-title">{t('embeddings.title')}</h2>
            <p className="section-description">{t('embeddings.description')}</p>

            {providers.length === 0 ? (
              <p className="mt-4 rounded-xl border border-default bg-background/55 px-3 py-2.5 text-sm text-muted">
                {t('embeddings.noProvider')}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {providers.length > 1 ? (
                  <div className="space-y-2">
                    {providers.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        aria-pressed={embeddingsProvider?.id === provider.id}
                        onClick={() => {
                          setEmbeddingProviderId(provider.id);
                          setProbe(null);
                        }}
                        className={`inline-flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
                          embeddingsProvider?.id === provider.id
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-default bg-transparent text-muted hover:bg-surface'
                        }`}
                      >
                        <span className="min-w-0 truncate">
                          {provider.name}
                        </span>
                        {embeddingsProvider?.id === provider.id ? (
                          <Icon name="check" className="size-4" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div>
                  <p className="text-sm font-medium">{t('embeddings.model')}</p>
                  <input
                    value={embeddingModel}
                    maxLength={120}
                    autoComplete="off"
                    placeholder={t('embeddings.modelPlaceholder')}
                    onChange={(event) => {
                      setEmbeddingModel(event.target.value);
                      setProbe(null);
                    }}
                    className="mt-2 min-h-11 w-full rounded-xl border border-separator bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    fullWidth
                    isPending={testing}
                    isDisabled={!embeddingModel.trim()}
                    onPress={() => void testEmbeddings()}
                  >
                    {t('embeddings.test')}
                  </Button>
                  <Button
                    variant="primary"
                    fullWidth
                    isPending={busy}
                    isDisabled={!embeddingModel.trim()}
                    onPress={() => void enableEmbeddings()}
                  >
                    {t('embeddings.enable')}
                  </Button>
                </div>
                {probe ? (
                  <p className="rounded-xl border border-success/35 bg-success/10 px-3 py-2.5 text-sm text-success">
                    {t('embeddings.probeOk', {
                      dimensions: probe.dimensions,
                    })}
                  </p>
                ) : null}
              </div>
            )}

            <Button
              variant="ghost"
              fullWidth
              className="mt-4"
              onPress={() => setStep(4)}
            >
              {t('actions.skip')}
            </Button>
          </AppPanel>
        ) : null}

        {step === 4 ? (
          <AppPanel className="p-4 sm:p-5">
            <h2 className="section-title">{t('ready.title')}</h2>
            <p className="section-description">{t('ready.description')}</p>

            <div className="mt-4 space-y-2">
              <ChecklistRow
                done
                label={t('ready.profile')}
                hint={profileName.trim() || settings.profileName}
              />
              <ChecklistRow
                done={providers.length > 0}
                label={t('ready.provider')}
                hint={
                  providers[0]
                    ? `${providers[0].name} · ${providers[0].model}`
                    : t('ready.providerMissing')
                }
                actionLabel={
                  providers.length === 0 ? t('ready.fix') : undefined
                }
                onAction={providers.length === 0 ? () => setStep(2) : undefined}
              />
              <ChecklistRow
                done={embeddingsEnabled}
                skipped={!embeddingsEnabled}
                label={t('ready.embeddings')}
                hint={
                  embeddingsEnabled
                    ? t('ready.embeddingsOn')
                    : t('ready.embeddingsSkipped')
                }
              />
            </div>

            <Button
              variant="primary"
              fullWidth
              className="mt-5"
              isPending={busy}
              onPress={() => void finish()}
            >
              {t('ready.start')}
            </Button>
          </AppPanel>
        ) : null}

        <div className="flex justify-center pb-4">
          <Button variant="ghost" size="sm" onPress={() => void finish()}>
            {t('actions.skipAll')}
          </Button>
        </div>
      </div>

      <ProviderEditorModal
        isOpen={editor.isOpen}
        step={editor.step}
        form={editor.form}
        token={editor.token}
        models={editor.models}
        latency={editor.latency}
        loadingModels={editor.loadingModels}
        testingEmbeddings={editor.testingEmbeddings}
        embeddingProbe={editor.embeddingProbe}
        saving={editor.saving}
        loadingCredentials={editor.loadingCredentials}
        error={editor.error}
        catalog={editor.catalog}
        onClose={() => editor.close()}
        onStepChange={editor.setStep}
        onChooseKind={editor.chooseKind}
        onPatch={editor.patch}
        onTokenChange={editor.setToken}
        onLoadModels={() => void editor.loadModels()}
        onTestEmbeddings={() => void editor.testEmbeddings()}
        onSave={() => void editor.save()}
      />
    </div>
  );
}
