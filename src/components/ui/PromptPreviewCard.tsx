import { Button, Chip, Surface } from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from '../../i18n/toast';
import { previewPrompt } from '../../lib/backend';
import { countRu } from '../../lib/plural';
import type { PromptPreviewInput, PromptPreviewResult } from '../../types';
import { Icon } from '../Icon';
import { UiModal } from './UiModal';

export function PromptPreviewCard({
  input,
  title = 'Расчёт промпта',
}: {
  input: PromptPreviewInput;
  title?: string;
}) {
  const [result, setResult] = useState<PromptPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const serializedInput = useMemo(() => JSON.stringify(input), [input]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const timeout = window.setTimeout(() => {
      void previewPrompt(JSON.parse(serializedInput) as PromptPreviewInput)
        .then((nextResult) => {
          if (active) setResult(nextResult);
        })
        .catch((caught) => {
          if (!active) return;
          setResult(null);
          setError(caught instanceof Error ? caught.message : String(caught));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [serializedInput]);

  const copyPrompt = async () => {
    if (!result?.prompt) return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Буфер обмена недоступен');
      }
      await navigator.clipboard.writeText(result.prompt);
      toast.success('Промпт скопирован');
    } catch (caught) {
      toast.danger('Не удалось скопировать промпт', {
        description: caught instanceof Error ? caught.message : String(caught),
      });
    }
  };

  return (
    <>
      <Surface className="rounded-2xl border border-separator bg-surface-secondary/50 p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-start gap-3 sm:flex-1">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <Icon name="database" className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block break-words text-sm">{title}</strong>
              <span className="mt-0.5 block break-words text-xs leading-5 text-muted">
                Итог после подстановки имён вместо {'{{user}}'} и {'{{char}}'}.
              </span>
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="w-full shrink-0 sm:w-auto"
            isDisabled={!result?.prompt || loading}
            onPress={() => setPreviewOpen(true)}
          >
            <Icon name="info" className="size-4" /> Полный промпт
          </Button>
        </div>

        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          <Chip size="sm" variant="soft" color="accent">
            {loading
              ? 'Считаем…'
              : `≈ ${countRu(result?.approximateTokens ?? 0, [
                  'токен',
                  'токена',
                  'токенов',
                ])}`}
          </Chip>
          <Chip size="sm" variant="soft">
            {countRu(result?.characters ?? 0, [
              'символ',
              'символа',
              'символов',
            ])}
          </Chip>
        </div>
        {error ? (
          <p className="selectable mt-3 text-xs text-danger">{error}</p>
        ) : null}
      </Surface>

      <UiModal
        isOpen={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Полный системный промпт"
        description="Это именно тот порядок секций, который получит модель; переменные уже подставлены."
        size="cover"
        footer={
          <>
            <Button variant="ghost" onPress={() => setPreviewOpen(false)}>
              Закрыть
            </Button>
            <Button
              variant="primary"
              isDisabled={!result?.prompt}
              onPress={() => void copyPrompt()}
            >
              <Icon name="copy" className="size-4" /> Копировать
            </Button>
          </>
        }
      >
        <pre className="selectable min-h-48 whitespace-pre-wrap break-words rounded-2xl border border-separator bg-default/50 p-4 font-mono text-xs leading-5">
          {result?.prompt || 'В промпте пока нет активных источников.'}
        </pre>
      </UiModal>
    </>
  );
}
