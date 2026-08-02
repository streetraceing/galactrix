import { Button, Input } from '@heroui/react';
import type { ChangeEvent } from 'react';
import { UiModal } from '../../../components/ui/UiModal';
import { isMobilePlatform } from '../../../lib/platform';
import type { Chat } from '../../../types';
import { useTranslation } from 'react-i18next';

export function ChatDialogs({
  renameTarget,
  renameValue,
  confirmTarget,
  working,
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
  onRenameValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCommitDestructive: () => void;
  onCloseRename: () => void;
  onCloseConfirm: () => void;
}) {
  const { t } = useTranslation('chats');
  const autoFocus = !isMobilePlatform();
  return (
    <>
      <UiModal
        isOpen={Boolean(renameTarget)}
        onOpenChange={(open) => !open && !working && onCloseRename()}
        onConfirm={onCommitRename}
        isConfirmDisabled={!renameValue.trim() || working}
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
          autoFocus={autoFocus}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onRenameValueChange(event.target.value)
          }
          aria-label={t('chatDialogs.newChatName')}
        />
      </UiModal>

      <UiModal
        isOpen={Boolean(confirmTarget)}
        onOpenChange={(open) => !open && !working && onCloseConfirm()}
        onConfirm={onCommitDestructive}
        isConfirmDisabled={!confirmTarget || working}
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
              autoFocus
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
      </UiModal>
    </>
  );
}
