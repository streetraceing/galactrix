import { Button, Input } from '@heroui/react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { UiModal } from '../../../components/ui/UiModal';
import type { Chat } from '../../../types';
import { useTranslation } from 'react-i18next';

export function ChatDialogs({
  renameTarget,
  renameValue,
  confirmTarget,
  working,
  error,
  onRenameValueChange,
  onCommitRename,
  onCommitDestructive,
  onCloseRename,
  onCloseConfirm,
}: {
  renameTarget: Chat | null;
  renameValue: string;
  confirmTarget: { type: 'clear' | 'delete'; chat: Chat } | null;
  working: boolean;
  error: string;
  onRenameValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCommitDestructive: () => void;
  onCloseRename: () => void;
  onCloseConfirm: () => void;
}) {
  const { t } = useTranslation('chats');
  return (
    <>
      <UiModal
        isOpen={Boolean(renameTarget)}
        onOpenChange={(open) => !open && !working && onCloseRename()}
        title={t('chatDialogs.renameChat')}
        description={t('chatDialogs.enterANewName')}
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={working}
              onPress={onCloseRename}
            >
              {t('chatDialogs.cancel')}
            </Button>
            <Button
              variant="primary"
              isPending={working}
              isDisabled={!renameValue.trim()}
              onPress={onCommitRename}
            >
              {t('chatDialogs.save')}
            </Button>
          </>
        }
      >
        <Input
          autoComplete="off"
          fullWidth
          variant="secondary"
          value={renameValue}
          maxLength={120}
          autoFocus
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onRenameValueChange(event.target.value)
          }
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') onCommitRename();
          }}
          aria-label={t('chatDialogs.newChatName')}
        />
        {error ? (
          <p className="selectable mt-2 text-sm text-danger">{error}</p>
        ) : null}
      </UiModal>

      <UiModal
        isOpen={Boolean(confirmTarget)}
        onOpenChange={(open) => !open && !working && onCloseConfirm()}
        title={
          confirmTarget?.type === 'delete'
            ? t('chatDialogs.deleteChat')
            : t('chatDialogs.clearHistory')
        }
        description={
          confirmTarget?.type === 'delete'
            ? t('chatDialogs.chatValue1AndAllItsMessagesWillBeDeleted', {
                value1: confirmTarget.chat.title,
              })
            : t('chatDialogs.allMessagesInValue1WillBeDeleted', {
                value1: confirmTarget?.chat.title ?? '',
              })
        }
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={working}
              onPress={onCloseConfirm}
            >
              {t('chatDialogs.cancel')}
            </Button>
            <Button
              variant="danger"
              isPending={working}
              onPress={onCommitDestructive}
            >
              {confirmTarget?.type === 'delete'
                ? t('chatDialogs.delete')
                : t('chatDialogs.clear')}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted">
          {t('chatDialogs.thisActionCannotBeUndone')}
        </p>
        {error ? (
          <p className="selectable mt-2 text-sm text-danger">{error}</p>
        ) : null}
      </UiModal>
    </>
  );
}
