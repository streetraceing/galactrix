import { Button, ProgressBar, Surface } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { toast } from '../../i18n/toast';
import { errorMessage } from '../../lib/errors';
import type { Chat, GenerationJob } from '../../types';
import { Icon } from '../Icon';
import { TooltipIconButton } from '../ui/TooltipIconButton';

export function GenerationJobQueue({
  jobs,
  chats,
  onOpenChat,
  onCancel,
}: {
  jobs: GenerationJob[];
  chats: Chat[];
  onOpenChat: (chatId: string) => void;
  onCancel: (generationId: string) => Promise<void>;
}) {
  const { t } = useTranslation('common');
  if (jobs.length === 0) return null;

  const chatTitles = new Map(chats.map((chat) => [chat.id, chat.title]));
  const cancel = async (generationId: string) => {
    try {
      await onCancel(generationId);
    } catch (error) {
      toast.danger(t('generationQueue.cancelFailed'), {
        description: errorMessage(error),
        timeout: 3_500,
      });
    }
  };

  return (
    <Surface
      variant="transparent"
      className="relative z-30 flex min-h-13 shrink-0 items-center gap-2 overflow-hidden rounded-none border-x-0 border-t-0 bg-surface/92 px-3 py-2 shadow-sm backdrop-blur-xl sm:gap-3 sm:px-4"
      aria-label={t('generationQueue.title', { count: jobs.length })}
    >
      <div className="flex shrink-0 items-center gap-2 text-accent">
        <span className="grid size-7 place-items-center rounded-full bg-accent/12">
          <Icon name="sparkles" className="size-4 motion-safe:animate-pulse" />
        </span>
        <span className="hidden text-xs font-semibold sm:block">
          {t('generationQueue.title', { count: jobs.length })}
        </span>
        <span className="text-xs font-semibold sm:hidden">{jobs.length}</span>
      </div>

      <div className="scrollbar-thin flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
        {jobs.map((job) => {
          const cancelling = job.status === 'cancelling';
          const title =
            chatTitles.get(job.chatId) ?? t('generationQueue.unknownChat');
          return (
            <div
              key={job.id}
              className="flex h-8 min-w-0 shrink-0 items-center rounded-lg border border-separator bg-background/80"
            >
              <Button
                size="sm"
                variant="ghost"
                className="h-8 min-w-0 max-w-52 gap-1.5 rounded-r-none px-2.5"
                aria-label={t('generationQueue.openChat', { title })}
                onPress={() => onOpenChat(job.chatId)}
              >
                <span className="max-w-30 truncate text-xs font-medium sm:max-w-40">
                  {title}
                </span>
                <span className="hidden text-[0.68rem] text-muted min-[420px]:inline">
                  {t(
                    cancelling
                      ? 'generationQueue.cancelling'
                      : `generationQueue.mode.${job.mode}`,
                  )}
                </span>
              </Button>
              <TooltipIconButton
                label={
                  cancelling
                    ? t('generationQueue.cancelling')
                    : t('generationQueue.cancel', { title })
                }
                size="sm"
                variant="ghost"
                className="size-8 min-w-8 rounded-l-none border-l border-separator"
                tooltipPlacement="bottom end"
                isDisabled={cancelling}
                onPress={() => void cancel(job.id)}
              >
                <Icon name="close" className="size-3.5" />
              </TooltipIconButton>
            </div>
          );
        })}
      </div>

      <ProgressBar
        isIndeterminate
        size="sm"
        aria-label={t('generationQueue.progress')}
        className="pointer-events-none absolute inset-x-0 bottom-0 gap-0"
      >
        <ProgressBar.Track className="h-0.5 rounded-none bg-accent/10">
          <ProgressBar.Fill className="rounded-none" />
        </ProgressBar.Track>
      </ProgressBar>
    </Surface>
  );
}
