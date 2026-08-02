import { Button } from '@heroui/react';
import { useRef, useState } from 'react';
import { errorMessage } from '../../lib/errors';
import { prepareAvatar } from '../../lib/image';
import { Icon } from '../Icon';
import { AppAvatar } from './AppAvatar';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export function AvatarPicker({
  value,
  name,
  description,
  disabled = false,
  compact = false,
  onChange,
  className,
}: {
  value?: string;
  name: string;
  description?: string;
  disabled?: boolean;
  compact?: boolean;
  onChange: (value?: string) => void | Promise<void>;
  className?: string;
}) {
  const { t } = useTranslation('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const choose = async (file?: File) => {
    if (!file || processing) return;
    setProcessing(true);
    setError('');
    try {
      const avatar = await prepareAvatar(file);
      await onChange(avatar);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    if (processing) return;
    setProcessing(true);
    setError('');
    try {
      await onChange(undefined);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className={clsx(
        compact ? 'min-w-0' : 'flex min-w-0 items-center gap-4',
        className,
      )}
    >
      {!compact ? (
        <AppAvatar src={value} name={name} className="size-20 sm:size-24" />
      ) : null}
      <div className="min-w-0 flex-1">
        {description ? (
          <p className="mb-3 text-xs leading-5 text-muted">{description}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={compact ? 'tertiary' : 'secondary'}
            isPending={processing}
            isDisabled={disabled}
            onPress={() => inputRef.current?.click()}
          >
            <Icon name={value ? 'edit' : 'plus'} className="size-4" />
            {value ? t('avatarPicker.replace') : t('avatarPicker.choosePhoto')}
          </Button>
          {value ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              isDisabled={disabled || processing}
              onPress={() => void remove()}
            >
              <Icon name="trash" className="size-4" />
              {t('avatarPicker.delete')}
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          disabled={disabled}
          onChange={(event) => void choose(event.target.files?.[0])}
        />
        {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
