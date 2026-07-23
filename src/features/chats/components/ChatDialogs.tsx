import { Button, Input } from '@heroui/react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { UiModal } from '../../../components/ui/UiModal';
import type { Chat } from '../../../types';

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
  return (
    <>
      <UiModal
        isOpen={Boolean(renameTarget)}
        onOpenChange={(open) => !open && !working && onCloseRename()}
        title="Переименовать чат"
        description="Введите новое название."
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={working}
              onPress={onCloseRename}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              isPending={working}
              isDisabled={!renameValue.trim()}
              onPress={onCommitRename}
            >
              Сохранить
            </Button>
          </>
        }
      >
        <Input
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
          aria-label="Новое название чата"
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
            ? 'Удалить чат?'
            : 'Очистить историю?'
        }
        description={
          confirmTarget?.type === 'delete'
            ? `Чат «${confirmTarget.chat.title}» и все сообщения будут удалены.`
            : `Все сообщения из чата «${confirmTarget?.chat.title ?? ''}» будут удалены.`
        }
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={working}
              onPress={onCloseConfirm}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              isPending={working}
              onPress={onCommitDestructive}
            >
              {confirmTarget?.type === 'delete' ? 'Удалить' : 'Очистить'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted">
          Это действие нельзя отменить.
        </p>
        {error ? (
          <p className="selectable mt-2 text-sm text-danger">{error}</p>
        ) : null}
      </UiModal>
    </>
  );
}
