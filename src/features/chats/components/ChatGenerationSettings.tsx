import { Button, Input, Label, Surface } from '@heroui/react';
import type { ChatGenerationSettings, Provider } from '../../../types';
import { useTranslation } from 'react-i18next';

type SettingKey = keyof ChatGenerationSettings;

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
  const patch = (key: SettingKey, rawValue: string) => {
    if (!rawValue.trim()) {
      const next = { ...value };
      delete next[key];
      onChange(next);
      return;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    const normalized =
      key === 'temperature'
        ? Math.min(2, Math.max(0, parsed))
        : key === 'topP'
          ? Math.min(1, Math.max(0, parsed))
          : Math.min(131_072, Math.max(1, Math.round(parsed)));
    onChange({ ...value, [key]: normalized });
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
          <Input
            id="chat-temperature"
            fullWidth
            variant="secondary"
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={value.temperature == null ? '' : String(value.temperature)}
            placeholder={String(provider?.temperature ?? 0.7)}
            onChange={(event) => patch('temperature', event.target.value)}
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="chat-top-p">{t('chatGenerationSettings.topP')}</Label>
          <Input
            id="chat-top-p"
            fullWidth
            variant="secondary"
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={value.topP == null ? '' : String(value.topP)}
            placeholder={String(provider?.topP ?? 0.95)}
            onChange={(event) => patch('topP', event.target.value)}
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="chat-max-tokens">
            {t('chatGenerationSettings.maxOutput')}
          </Label>
          <Input
            id="chat-max-tokens"
            fullWidth
            variant="secondary"
            type="number"
            min={1}
            max={131_072}
            step={1}
            value={value.maxTokens == null ? '' : String(value.maxTokens)}
            placeholder={String(provider?.maxTokens ?? 4096)}
            onChange={(event) => patch('maxTokens', event.target.value)}
          />
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">
        {t('chatGenerationSettings.inheritHint')}
      </p>
    </Surface>
  );
}
