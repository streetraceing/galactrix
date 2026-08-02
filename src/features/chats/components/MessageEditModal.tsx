import { Button, TextArea } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UiModal } from '../../../components/ui/UiModal';
import { toast } from '../../../i18n/toast';
import { errorMessage } from '../../../lib/errors';
import { isMobilePlatform } from '../../../lib/platform';
import type { Message } from '../../../types';

export function MessageEditModal({
  message,
  onClose,
  onEdit,
}: {
  message: Message | null;
  onClose: () => void;
  onEdit: (messageId: string, content: string) => Promise<void>;
}) {
  const { t } = useTranslation('chats');
  const isMobile = isMobilePlatform();
  const [value, setValue] = useState(message?.content ?? '');
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const content = value.trim();
    if (!message || !content || saving) return;

    setSaving(true);
    try {
      await onEdit(message.id, content);
      onClose();
    } catch (error) {
      const description = errorMessage(error);
      if (description) {
        toast.danger(t('errors.chatActionFailed'), {
          description,
          timeout: 3_500,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <UiModal
      isOpen={Boolean(message)}
      onOpenChange={(open) => !open && !saving && onClose()}
      onConfirm={() => void commit()}
      isConfirmDisabled={!message || !value.trim() || saving}
      title={t('messageList.editMessage')}
      description={
        message?.role === 'assistant'
          ? t('messageList.theEditedTextWillBeSavedAsANewResponse')
          : t('messageList.theChangeAppliesToTheCurrentConversationHistory')
      }
      size={isMobile ? 'full' : 'cover'}
      footer={
        <>
          <Button variant="ghost" isDisabled={saving} onPress={onClose}>
            {t('chatDialogs.cancel')}
          </Button>
          <Button
            variant="primary"
            isPending={saving}
            isDisabled={!value.trim()}
            onPress={() => void commit()}
          >
            {t('chatDialogs.save')}
          </Button>
        </>
      }
    >
      <TextArea
        autoComplete="off"
        fullWidth
        variant="secondary"
        value={value}
        className="[&_textarea]:min-h-72 h-full"
        aria-label={t('messageList.messageText')}
        onChange={(event) => setValue(event.target.value)}
      />
    </UiModal>
  );
}
