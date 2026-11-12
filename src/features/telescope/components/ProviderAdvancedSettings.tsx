import { Input, TextArea, Select, ListBox, Label } from '@heroui/react';
import type { Key } from 'react';
import { AppPanel } from '../../../components/ui/AppPanel';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { SettingSwitchRow } from '../../profile/components/SettingSwitchRow';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { JsonValue, ProviderInput, ProviderOptions } from '../../../types';
import { compatiblePresets, parseJsonObject } from '../providerOptions';
import { FormField } from './FormField';

function JsonObjectField({
  label,
  value,
  onChange,
  onValidityChange,
}: {
  label: string;
  value?: Record<string, JsonValue>;
  onChange: (value: Record<string, JsonValue>) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const { t } = useTranslation('telescope');
  const serialized = JSON.stringify(value ?? {}, null, 2);
  const [draft, setDraft] = useState(serialized);
  const [invalid, setInvalid] = useState(false);
  // Do not replace the user's invalid draft with the last valid object.
  useEffect(() => {
    setDraft((current) => {
      try {
        if (
          JSON.stringify(parseJsonObject(current)) ===
          JSON.stringify(JSON.parse(serialized))
        )
          return current;
      } catch {
        /* external changes reset draft */
      }
      return serialized;
    });
  }, [serialized]);
  return (
    <FormField label={label}>
      <TextArea
        aria-label={label}
        aria-invalid={invalid}
        fullWidth
        variant="secondary"
        rows={4}
        value={draft}
        className="font-mono text-sm"
        spellCheck={false}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          try {
            const object = parseJsonObject(text);
            onChange(object);
            setInvalid(false);
            onValidityChange(true);
          } catch {
            setInvalid(true);
            onValidityChange(false);
          }
        }}
      />
      {invalid ? (
        <p role="alert" className="mt-1 text-sm text-danger">
          {t('advanced.invalidJson')}
        </p>
      ) : null}
    </FormField>
  );
}

function NumericOptionField({
  label,
  value,
  min,
  max,
  step = 1,
  placeholder,
  onChange,
  onValidityChange,
}: {
  label: string;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  placeholder: string;
  onChange: (value: number | undefined) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const [draft, setDraft] = useState(value == null ? '' : String(value));
  useEffect(() => {
    setDraft((current) =>
      current.trim() !== '' && Number(current) === value
        ? current
        : value == null
          ? ''
          : String(value),
    );
  }, [value]);
  return (
    <FormField label={label}>
      <Input
        aria-label={label}
        fullWidth
        variant="secondary"
        type="text"
        inputMode="decimal"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          if (!raw.trim()) {
            onChange(undefined);
            onValidityChange(true);
            return;
          }
          const n = Number(raw);
          const valid =
            Number.isFinite(n) &&
            (min == null || n >= min) &&
            (max == null || n <= max) &&
            (step !== 1 || Number.isSafeInteger(n));
          onValidityChange(valid);
          if (valid) onChange(n);
        }}
      />
    </FormField>
  );
}

function StopSequencesField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const serialized = JSON.stringify(value);
  const [draft, setDraft] = useState(value.join('\n'));
  useEffect(() => {
    setDraft((current) =>
      JSON.stringify(current.split('\n').filter(Boolean)) === serialized
        ? current
        : (JSON.parse(serialized) as string[]).join('\n'),
    );
  }, [serialized]);
  return (
    <FormField label={label}>
      <TextArea
        aria-label={label}
        fullWidth
        variant="secondary"
        rows={2}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(event.target.value.split('\n').filter(Boolean));
        }}
      />
    </FormField>
  );
}

export function ProviderAdvancedSettings({
  form,
  onPatch,
  onValidityChange,
}: {
  form: ProviderInput;
  onPatch: <K extends keyof ProviderInput>(
    key: K,
    value: ProviderInput[K],
  ) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const { t } = useTranslation('telescope');
  const options = form.options ?? {};
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>(
    {},
  );
  const valid = !Object.values(invalidFields).some(Boolean);
  useEffect(() => {
    onValidityChange(valid);
  }, [valid, onValidityChange]);
  const validity = (key: string, ok: boolean) =>
    setInvalidFields((current) => ({ ...current, [key]: !ok }));
  const patch = <K extends keyof ProviderOptions>(
    key: K,
    value: ProviderOptions[K],
  ) => onPatch('options', { ...options, [key]: value });
  const numeric = (
    key:
      | 'topK'
      | 'seed'
      | 'thinkingBudget'
      | 'frequencyPenalty'
      | 'presencePenalty'
      | 'repetitionPenalty'
      | 'embeddingDimensions',
    min?: number,
    max?: number,
    step = 1,
  ) => (
    <NumericOptionField
      label={t(`advanced.${key}`)}
      value={options[key]}
      min={min}
      max={max}
      step={step}
      placeholder={t('advanced.default')}
      onValidityChange={(ok) => validity(key, ok)}
      onChange={(value) => {
        if (key === 'thinkingBudget')
          onPatch('options', {
            ...options,
            thinkingBudget: value,
            thinkingLevel: undefined,
          });
        else patch(key, value);
      }}
    />
  );
  const select = (
    label: string,
    value: string,
    change: (value: string) => void,
    choices: string[],
  ) => (
    <FormField label={label}>
      <Select
        aria-label={label}
        fullWidth
        variant="secondary"
        className="min-w-0 max-w-full"
        value={value || '__default__'}
        onChange={(key: Key | Key[] | null) => {
          const next = String(key ?? '__default__');
          change(next === '__default__' ? '' : next);
        }}
      >
        <Select.Trigger className="w-full min-w-0 max-w-full">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="__default__" textValue={t('advanced.default')}>
              <Label>{t('advanced.default')}</Label>
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {choices.map((choice) => (
              <ListBox.Item id={choice} key={choice} textValue={choice}>
                <Label>{choice}</Label>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </FormField>
  );
  const flag = (
    key: 'omitSampling' | 'noAuth' | 'streamUsage',
    checked = false,
  ) => (
    <SettingSwitchRow
      label={t(`advanced.${key}`)}
      description={t(`advanced.${key}Description`)}
      value={options[key] ?? checked}
      onChange={(value) => patch(key, value)}
    />
  );
  const text = (
    key: 'chatPath' | 'modelsPath' | 'authHeader' | 'authPrefix',
    placeholder: string,
  ) => (
    <FormField label={t(`advanced.${key}`)}>
      <Input
        fullWidth
        variant="secondary"
        aria-label={t(`advanced.${key}`)}
        autoComplete="off"
        value={options[key] ?? ''}
        placeholder={placeholder}
        onChange={(event) =>
          patch(
            key,
            key === 'authPrefix'
              ? event.target.value
              : event.target.value || undefined,
          )
        }
      />
    </FormField>
  );
  const section = (title: string, children: ReactNode) => (
    <AppPanel emphasis="subtle" className="min-w-0 space-y-4 p-4">
      <SectionHeader title={title} />
      {children}
    </AppPanel>
  );

  return (
    <div className="min-w-0 space-y-4">
      {section(
        t('advanced.generation'),
        <>
          <p className="text-xs leading-5 text-muted">
            {t('advanced.capabilitiesHint')}
          </p>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {select(
              t('advanced.reasoningEffort'),
              options.reasoningEffort ?? '',
              (v) =>
                patch(
                  'reasoningEffort',
                  (v || undefined) as ProviderOptions['reasoningEffort'],
                ),
              ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'],
            )}
            {form.kind === 'google-gemini'
              ? select(
                  t('advanced.thinkingLevel'),
                  options.thinkingLevel ?? '',
                  (v) => {
                    validity('thinkingBudget', true);
                    onPatch('options', {
                      ...options,
                      thinkingLevel: (v ||
                        undefined) as ProviderOptions['thinkingLevel'],
                      thinkingBudget: undefined,
                    });
                  },
                  ['minimal', 'low', 'medium', 'high'],
                )
              : null}
            {form.kind === 'google-gemini' || form.kind === 'openrouter'
              ? numeric(
                  'thinkingBudget',
                  form.kind === 'google-gemini' ? -1 : 1,
                )
              : null}
            {numeric('topK', 1)}
            {numeric('seed')}
            {numeric('frequencyPenalty', -2, 2, 0.1)}
            {numeric('presencePenalty', -2, 2, 0.1)}
            {numeric('repetitionPenalty', 0.01, undefined, 0.1)}
            {select(
              t('advanced.maxTokensField'),
              options.maxTokensField ?? '',
              (v) =>
                patch(
                  'maxTokensField',
                  (v || undefined) as ProviderOptions['maxTokensField'],
                ),
              ['max_tokens', 'max_completion_tokens', 'omit'],
            )}
          </div>
          {flag('omitSampling')}
          <StopSequencesField
            label={t('advanced.stop')}
            value={options.stop ?? []}
            onChange={(value) => patch('stop', value)}
          />
          <p className="text-xs leading-5 text-muted">
            {t('advanced.jsonHint')}
          </p>
          <JsonObjectField
            label={t('advanced.extraBody')}
            value={options.extraBody}
            onChange={(v) => patch('extraBody', v)}
            onValidityChange={(v) => validity('extraBody', v)}
          />
        </>,
      )}
      {section(
        t('advanced.transport'),
        <>
          {form.kind === 'custom' ? (
            <FormField label={t('advanced.preset')}>
              <Select
                aria-label={t('advanced.preset')}
                fullWidth
                variant="secondary"
                value={null}
                placeholder={t('advanced.selectPreset')}
                onChange={(key: Key | Key[] | null) => {
                  const preset = compatiblePresets.find(
                    (p) => p.id === String(key ?? ''),
                  );
                  if (!preset) return;
                  onPatch('baseUrl', preset.baseUrl);
                  onPatch('options', {
                    ...options,
                    authHeader: undefined,
                    authPrefix: undefined,
                    noAuth: false,
                    chatPath: undefined,
                    modelsPath: undefined,
                    ...preset.options,
                  });
                }}
              >
                <Select.Trigger className="w-full min-w-0 max-w-full">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {compatiblePresets.map((preset) => (
                      <ListBox.Item
                        id={preset.id}
                        key={preset.id}
                        textValue={preset.name}
                      >
                        <Label>{preset.name}</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </FormField>
          ) : null}
          <p className="text-xs leading-5 text-muted">
            {t('advanced.transportHint')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('chatPath', 'chat/completions')}
            {text('modelsPath', 'models')}
            {text('authHeader', 'Authorization')}
            {text('authPrefix', 'Bearer')}
          </div>
          {flag('noAuth')}
          {flag('streamUsage', true)}
          <p className="text-xs leading-5 text-muted">
            {t('advanced.headersHint')}
          </p>
          <JsonObjectField
            label={t('advanced.headers')}
            value={options.headers}
            onChange={(v) => {
              const ok = Object.values(v).every(
                (value) => typeof value === 'string',
              );
              if (ok) patch('headers', v as Record<string, string>);
              validity('headerValues', ok);
            }}
            onValidityChange={(v) => validity('headers', v)}
          />
        </>,
      )}
      {section(
        t('advanced.embeddings'),
        <>
          <p className="text-xs leading-5 text-muted">
            {t('advanced.embeddingHint')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {select(
              t('advanced.embeddingFormat'),
              options.embeddingFormat ?? '',
              (v) =>
                patch(
                  'embeddingFormat',
                  (v || undefined) as ProviderOptions['embeddingFormat'],
                ),
              ['auto', 'openai', 'ollama'],
            )}
            {numeric('embeddingDimensions', 1)}
          </div>
          <JsonObjectField
            label={t('advanced.embeddingExtraBody')}
            value={options.embeddingExtraBody}
            onChange={(v) => patch('embeddingExtraBody', v)}
            onValidityChange={(v) => validity('embeddingExtraBody', v)}
          />
        </>,
      )}
      {!valid ? (
        <p role="alert" className="text-sm text-danger">
          {t('advanced.invalidOptions')}
        </p>
      ) : null}
    </div>
  );
}
