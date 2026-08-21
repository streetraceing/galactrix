import { Button, Input, Label, Surface } from '@heroui/react';
import type { ChatGenerationSettings, Provider } from '../../../types';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

type SettingKey = keyof ChatGenerationSettings;

function normalizeSettingValue(key: SettingKey, value: number) {
  if (key === 'temperature') return Math.min(2, Math.max(0, value));
  if (key === 'topP') return Math.min(1, Math.max(0, value));
  return Math.min(131_072, Math.max(1, Math.round(value)));
}

function GenerationOverrideInput({
  id,
  setting,
  value,
  placeholder,
  min,
  max,
  step,
  onValueChange,
}: {
  id: string;
  setting: SettingKey;
  value?: number;
  placeholder: string;
  min: number;
  max: number;
  step: number;
  onValueChange: (value?: number) => void;
}) {
  const [draft, setDraft] = useState(value == null ? '' : String(value));

  useEffect(() => {
    const parsed = Number(draft);
    const draftMatchesValue =
      draft.trim() === ''
        ? value == null
        : Number.isFinite(parsed) &&
          normalizeSettingValue(setting, parsed) === value;
    if (!draftMatchesValue) setDraft(value == null ? '' : String(value));
  }, [draft, setting, value]);

  const updateDraft = (rawValue: string) => {
    setDraft(rawValue);
    if (!rawValue.trim()) {
      onValueChange(undefined);
      return;
    }
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed)) {
      onValueChange(normalizeSettingValue(setting, parsed));
    }
  };

  const normalizeDraft = () => {
    if (!draft.trim()) return;
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(value == null ? '' : String(value));
      return;
    }
    const normalized = normalizeSettingValue(setting, parsed);
    setDraft(String(normalized));
    onValueChange(normalized);
  };

  return (
    <Input
      id={id}
      fullWidth
      variant="secondary"
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft}
      placeholder={placeholder}
      onBlur={normalizeDraft}
      onChange={(event) => updateDraft(event.target.value)}
    />
  );
}

export function ChatGenerationSettingsPanel({
  value,
  provider,
  onChange,
}: {
  value: ChatGenerationSettings;
  provider?: Provider;
  onChange: (value: ChatGenerationSettings) => void;
}) {
  const { t } = useTranslation('chats');
  const patch = (key: SettingKey, nextValue?: number) => {
    if (nextValue == null) {
      const next = { ...value };
      delete next[key];
      onChange(next);
      return;
    }
    onChange({ ...value, [key]: nextValue });
  };
  const hasOverrides = Object.values(value).some((entry) => entry != null);

  return (
    <Surface className="min-w-0 rounded-2xl border border-separator bg-surface-secondary/50 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">
            {t('chatGenerationSettings.title')}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            {t('chatGenerationSettings.description')}
          </p>
        </div>
        {hasOverrides ? (
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0"
            onPress={() => onChange({})}
          >
            {t('chatGenerationSettings.reset')}
          </Button>
        ) : null}
      </div>
      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-3">
        <div className="min-w-0">
          <Label htmlFor="chat-temperature">
            {t('chatGenerationSettings.temperature')}
          </Label>
          <GenerationOverrideInput
            id="chat-temperature"
            setting="temperature"
            min={0}
            max={2}
            step={0.1}
            value={value.temperature}
            placeholder={String(provider?.temperature ?? 0.7)}
            onValueChange={(nextValue) => patch('temperature', nextValue)}
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="chat-top-p">{t('chatGenerationSettings.topP')}</Label>
          <GenerationOverrideInput
            id="chat-top-p"
            setting="topP"
            min={0}
            max={1}
            step={0.05}
            value={value.topP}
            placeholder={String(provider?.topP ?? 0.95)}
            onValueChange={(nextValue) => patch('topP', nextValue)}
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="chat-max-tokens">
            {t('chatGenerationSettings.maxOutput')}
          </Label>
          <GenerationOverrideInput
            id="chat-max-tokens"
            setting="maxTokens"
            min={1}
            max={131_072}
            step={1}
            value={value.maxTokens}
            placeholder={String(provider?.maxTokens ?? 4096)}
            onValueChange={(nextValue) => patch('maxTokens', nextValue)}
          />
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">
        {t('chatGenerationSettings.inheritHint')}
      </p>
    </Surface>
  );
}
