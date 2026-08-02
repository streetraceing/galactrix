import { i18next } from '../../i18n';
import { toast } from '../../i18n/toast';

export async function copyChatText(content: string, successMessage?: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    toast.success(
      successMessage ?? i18next.t('copy.messageSuccess', { ns: 'chats' }),
    );
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) {
    throw new Error(i18next.t('errors.clipboardUnavailable', { ns: 'chats' }));
  }
  toast.success(
    successMessage ?? i18next.t('copy.messageSuccess', { ns: 'chats' }),
  );
}
