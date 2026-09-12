import { Button } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { ExportDestinationPicker } from '../../../components/ui/ExportOptions';
import { UiModal } from '../../../components/ui/UiModal';
import type { TranslationKey } from '../../../i18n';
import { toast } from '../../../i18n/toast';
import { errorMessage } from '../../../lib/errors';
import {
  defaultExportDestination,
  exportTextFile,
  type ExportDestination,
} from '../../../lib/jsonTransfer';
import type { Chat, Message } from '../../../types';
import {
  buildChatJson,
  buildChatMarkdown,
  chatExportFilename,
  type ChatExportFormat,
} from '../chatExport';

const FORMATS: Array<{
  value: ChatExportFormat;
  labelKey: TranslationKey<'chats'>;
  hintKey: TranslationKey<'chats'>;
  icon: 'download' | 'copy';
}> = [
  {
    value: 'markdown',
    labelKey: 'exportChat.markdown',
    hintKey: 'exportChat.markdownHint',
    icon: 'download',
  },
  {
    value: 'json',
    labelKey: 'exportChat.json',
    hintKey: 'exportChat.jsonHint',
    icon: 'copy',
  },
];

export function ExportChatModal({
  chat,
  messages,
  onClose,
}: {
  chat: Chat | null;
  messages: Message[];
  onClose: () => void;
}) {
  const { t } = useTranslation('chats');
  const [format, setFormat] = useState<ChatExportFormat>('markdown');
  const [destination, setDestination] = useState<ExportDestination>(() =>
    defaultExportDestination(),
  );
  const [exporting, setExporting] = useState(false);

  const run = async () => {
    if (!chat || exporting) return;
    setExporting(true);
    try {
      const now = new Date();
      const filename = chatExportFilename(chat, format, now);
      const exported =
        format === 'markdown'
          ? await exportTextFile(
              filename,
              buildChatMarkdown(
                chat,
                messages,
                {
                  user: t('exportChat.roleUser'),
                  assistant: t('exportChat.roleAssistant'),
                  system: t('exportChat.roleSystem'),
                  exportedFrom: t('exportChat.exportedFrom'),
                },
                now,
              ),
              {
                mime: 'text/markdown',
                filterName: 'Galactrix Markdown',
                extension: 'md',
              },
              destination,
            )
          : await exportTextFile(
              filename,
              JSON.stringify(buildChatJson(chat, messages, now), null, 2),
              {
                mime: 'application/json',
                filterName: 'Galactrix JSON',
                extension: 'json',
              },
              destination,
            );
      if (!exported) return;
      onClose();
      toast.success(t('exportChat.saved'));
    } catch (caught) {
      toast.danger(t('exportChat.failed'), {
        description: errorMessage(caught),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <UiModal
      isOpen={chat != null}
      onOpenChange={(open) => !open && !exporting && onClose()}
      onConfirm={() => void run()}
      isConfirmDisabled={exporting || !chat}
      title={t('exportChat.title')}
      description={t('exportChat.description')}
      size="lg"
      footer={
        <>
          <Button variant="ghost" isDisabled={exporting} onPress={onClose}>
            {t('exportChat.cancel')}
          </Button>
          <Button
            variant="primary"
            autoFocus
            isPending={exporting}
            isDisabled={!chat}
            onPress={() => void run()}
          >
            <Icon name="download" className="size-4" />
            {t('exportChat.export')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium">{t('exportChat.format')}</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FORMATS.map((entry) => {
              const active = format === entry.value;
              return (
                <button
                  key={entry.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFormat(entry.value)}
                  className={`flex min-h-14 w-full cursor-pointer flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
                    active
                      ? 'border-accent bg-accent/10'
                      : 'border-default bg-transparent hover:bg-surface'
                  }`}
                >
                  <span
                    className={`flex items-center gap-2 text-sm font-semibold ${
                      active ? 'text-accent' : ''
                    }`}
                  >
                    <Icon name={entry.icon} className="size-4" />
                    {t(entry.labelKey)}
                  </span>
                  <span className="text-xs leading-4 text-muted">
                    {t(entry.hintKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">{t('exportChat.destination')}</p>
          <div className="mt-2">
            <ExportDestinationPicker
              value={destination}
              onChange={setDestination}
            />
          </div>
        </div>
      </div>
    </UiModal>
  );
}
