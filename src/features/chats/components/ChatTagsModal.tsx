import { Button, Input, Label } from '@heroui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { UiModal } from '../../../components/ui/UiModal';
import { toast } from '../../../i18n/toast';
import { errorMessage } from '../../../lib/errors';
import type { Chat } from '../../../types';

const MAX_TAG_LENGTH = 40;

export function ChatTagsModal({
  isOpen,
  chatIds,
  chats,
  working,
  onApply,
  onClose,
}: {
  isOpen: boolean;
  chatIds: string[];
  chats: Chat[];
  working: boolean;
  onApply: (
    chatIds: string[],
    addTags: string[],
    removeTags: string[],
  ) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation('chats');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const chatsRef = useRef(chats);
  chatsRef.current = chats;
  const chatIdsRef = useRef(chatIds);
  chatIdsRef.current = chatIds;

  // Seed the selection with the tags shared by every targeted chat.
  useEffect(() => {
    if (!isOpen) return;
    const ids = new Set(chatIdsRef.current);
    const targets = chatsRef.current.filter((chat) => ids.has(chat.id));
    setSelected(
      () =>
        targets.reduce<Set<string> | null>((shared, chat, index) => {
          const tags = new Set(chat.tags);
          if (index === 0) return tags;
          return shared
            ? new Set([...shared].filter((tag) => tags.has(tag)))
            : shared;
        }, null) ?? new Set(),
    );
    setNewTags([]);
    setNewTag('');
  }, [isOpen]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const chat of chats) for (const tag of chat.tags) tags.add(tag);
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [chats]);

  const targets = useMemo(
    () => chats.filter((chat) => chatIds.includes(chat.id)),
    [chatIds, chats],
  );

  const addNewTag = () => {
    const tag = newTag.trim();
    if (!tag || tag.length > MAX_TAG_LENGTH) return;
    setNewTags((current) =>
      current.includes(tag) ? current : [...current, tag],
    );
    setNewTag('');
  };

  const toggleTag = (tag: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const apply = async () => {
    if (saving || working || chatIds.length === 0) return;
    const addTags = [...new Set([...selected, ...newTags])];
    const removeTags = allTags.filter(
      (tag) =>
        !selected.has(tag) && targets.some((chat) => chat.tags.includes(tag)),
    );
    setSaving(true);
    try {
      await onApply(chatIds, addTags, removeTags);
      onClose();
      toast.success(t('tagsModal.tagsApplied', { count: chatIds.length }));
    } catch (error) {
      toast.danger(t('errors.chatActionFailed'), {
        description: errorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <UiModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && !saving && onClose()}
      onConfirm={() => void apply()}
      isConfirmDisabled={saving || working || chatIds.length === 0}
      title={t('tagsModal.title', { count: chatIds.length })}
      description={t('tagsModal.description')}
      size="lg"
      footer={
        <>
          <Button variant="ghost" isDisabled={saving} onPress={onClose}>
            {t('tagsModal.cancel')}
          </Button>
          <Button
            variant="primary"
            autoFocus
            isPending={saving}
            isDisabled={working || chatIds.length === 0}
            onPress={() => void apply()}
          >
            <Icon name="tag" className="size-4" />
            {t('tagsModal.apply')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {allTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const isSelected = selected.has(tag);
              const onTargets = targets.filter((chat) =>
                chat.tags.includes(tag),
              ).length;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={isSelected}
                  className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
                    isSelected
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-default bg-transparent text-muted hover:bg-surface'
                  }`}
                >
                  {tag}
                  <span className="ml-1.5 opacity-70">
                    {onTargets}/{targets.length}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">{t('tagsModal.noTagsYet')}</p>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chat-tags-new-tag">{t('tagsModal.newTag')}</Label>
          <div className="flex gap-2">
            <Input
              id="chat-tags-new-tag"
              autoComplete="off"
              fullWidth
              variant="secondary"
              value={newTag}
              maxLength={MAX_TAG_LENGTH}
              placeholder={t('tagsModal.newTagPlaceholder')}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setNewTag(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                addNewTag();
              }}
            />
            <Button
              variant="secondary"
              className="shrink-0 px-3"
              isDisabled={!newTag.trim()}
              onPress={addNewTag}
            >
              <Icon name="plus" className="size-4" />
            </Button>
          </div>
        </div>

        {newTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {newTags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent"
              >
                {tag}
                <button
                  type="button"
                  aria-label={t('tagsModal.removePendingTag', { tag })}
                  className="cursor-pointer rounded p-1 outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  onClick={() =>
                    setNewTags((current) =>
                      current.filter((candidate) => candidate !== tag),
                    )
                  }
                >
                  <Icon name="close" className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </UiModal>
  );
}
