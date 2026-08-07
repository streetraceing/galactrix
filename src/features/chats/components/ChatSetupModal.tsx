import { Button, Input, Label, Tabs, TextArea } from '@heroui/react';
import { useEffect, useState } from 'react';
import { UiModal } from '../../../components/ui/UiModal';
import { PromptPreviewCard } from '../../../components/ui/PromptPreviewCard';
import { isMobilePlatform } from '../../../lib/platform';
import type {
  AiModuleSettings,
  Chat,
  ChatConfigInput,
  GalaxyItem,
  Message,
  Provider,
} from '../../../types';
import {
  activePromptSources,
  chatConfigFromChat,
  createChatConfig,
  inheritedPromptSetIds,
  isChatConfigValid,
  normalizeRecentMessageLimit,
} from '../chatConfig';
import { promptPreviewFromChat } from '../promptPreview';
import { ChatContextPicker } from './ChatContextPicker';
import { ChatModuleOverridesPanel } from './ChatModuleOverrides';
import { ChatProviderPicker } from './ChatProviderPicker';
import { PromptBuilder } from './PromptBuilder';
import { useTranslation } from 'react-i18next';

export function ChatSetupModal({
  isOpen,
  chat,
  galaxyItems,
  aiModules,
  providers,
  profileName,
  responseLanguage,
  messages = [],
  saving,
  onOpenChange,
  onSubmit,
}: {
  isOpen: boolean;
  chat: Chat | null;
  galaxyItems: GalaxyItem[];
  aiModules: AiModuleSettings;
  providers: Provider[];
  profileName?: string;
  responseLanguage?: 'en' | 'ru';
  messages?: Message[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ChatConfigInput) => void;
}) {
  const autoFocus = !isMobilePlatform();
  const { t } = useTranslation('chats');
  const defaultTitle = t('setup.defaultTitle');
  const [form, setForm] = useState<ChatConfigInput>(() =>
    createChatConfig(defaultTitle),
  );
  const [recentLimitDraft, setRecentLimitDraft] = useState('');
  const [section, setSection] = useState<
    'general' | 'context' | 'modules' | 'prompt'
  >('general');

  useEffect(() => {
    if (!isOpen) return;
    const nextForm = chat
      ? chatConfigFromChat(chat)
      : createChatConfig(defaultTitle);
    setForm(nextForm);
    setSection('general');
    setRecentLimitDraft(String(nextForm.promptConfig.recentMessageLimit ?? 50));
  }, [chat, defaultTitle, isOpen]);

  const canSubmit = isChatConfigValid(form) && !saving;
  const submit = () => {
    if (!canSubmit) return;
    const greetingMessage = form.greetingMessage?.trim();
    onSubmit({
      ...form,
      title: form.title.trim(),
      greetingMessage: chat ? undefined : greetingMessage || undefined,
    });
  };
  const promptSources = activePromptSources(form, messages);

  return (
    <UiModal
      isOpen={isOpen}
      onOpenChange={(open) => !saving && onOpenChange(open)}
      onConfirm={submit}
      isConfirmDisabled={!canSubmit}
      size="cover"
      title={
        chat ? t('chatSetupModal.chatSettings') : t('chatSetupModal.newChat')
      }
      description={t(
        'chatSetupModal.youCanChangeTheProviderRoleplayContextAndResponseStyle',
      )}
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            isDisabled={saving}
            onPress={() => onOpenChange(false)}
          >
            {t('chatDialogs.cancel')}
          </Button>
          <Button
            variant="primary"
            isPending={saving}
            isDisabled={!canSubmit}
            onPress={submit}
          >
            {chat ? t('chatDialogs.save') : t('chatSetupModal.createChat')}
          </Button>
        </div>
      }
    >
      <Tabs
        selectedKey={section}
        onSelectionChange={(key) =>
          setSection(
            String(key) as 'general' | 'context' | 'modules' | 'prompt',
          )
        }
        className="w-full min-w-0"
      >
        <Tabs.ListContainer className="w-full">
          <Tabs.List
            aria-label={t('chatSetupModal.sections')}
            className="w-max min-w-full *:min-w-max *:flex-1 *:px-3 sm:*:px-4"
          >
            <Tabs.Tab id="general">
              {t('chatSetupModal.general')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="context">
              {t('chatSetupModal.context')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="modules">
              {t('chatSetupModal.modules')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="prompt">
              {t('chatSetupModal.prompt')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="general" className="pt-4 sm:pt-5">
          <div className="min-w-0 space-y-3 sm:space-y-4">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="chat-title">{t('chatSetupModal.name')}</Label>
                <Input
                  id="chat-title"
                  fullWidth
                  variant="secondary"
                  value={form.title}
                  maxLength={120}
                  autoFocus={autoFocus}
                  autoComplete="off"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="min-h-10 flex items-center"
                />
              </div>
              <ChatProviderPicker
                providers={providers}
                value={form.providerId}
                onChange={(providerId) =>
                  setForm((current) => ({ ...current, providerId }))
                }
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="chat-recent-message-limit">
                {t('chatSetupModal.recentMessageLimit')}
              </Label>
              <Input
                id="chat-recent-message-limit"
                fullWidth
                variant="secondary"
                type="number"
                min={0}
                max={500}
                step={1}
                value={recentLimitDraft}
                onChange={(event) => {
                  const rawValue = event.target.value;
                  setRecentLimitDraft(rawValue);
                  if (rawValue.trim() === '') return;
                  const recentMessageLimit =
                    normalizeRecentMessageLimit(rawValue);
                  setForm((current) => ({
                    ...current,
                    promptConfig: {
                      ...current.promptConfig,
                      recentMessageLimit,
                    },
                  }));
                }}
                onBlur={() => {
                  const recentMessageLimit =
                    normalizeRecentMessageLimit(recentLimitDraft);
                  setRecentLimitDraft(String(recentMessageLimit));
                  setForm((current) => ({
                    ...current,
                    promptConfig: {
                      ...current.promptConfig,
                      recentMessageLimit,
                    },
                  }));
                }}
              />
              <p className="text-xs leading-5 text-muted">
                {t('chatSetupModal.recentMessageLimitDescription')}
              </p>
            </div>

            {!chat ? (
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="chat-greeting">
                  {t('chatSetupModal.greetingMessage')}
                </Label>
                <TextArea
                  id="chat-greeting"
                  fullWidth
                  variant="secondary"
                  value={form.greetingMessage ?? ''}
                  maxLength={12_000}
                  rows={3}
                  autoComplete="off"
                  placeholder={t('chatSetupModal.greetingMessagePlaceholder')}
                  aria-label={t('chatSetupModal.greetingMessage')}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      greetingMessage: event.target.value,
                    }))
                  }
                />
                <p className="text-xs leading-5 text-muted">
                  {t('chatSetupModal.greetingMessageDescription')}
                </p>
              </div>
            ) : null}
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="context" className="pt-4 sm:pt-5">
          <ChatContextPicker
            galaxyItems={galaxyItems}
            value={form}
            onChange={setForm}
            isOpen={isOpen}
          />
        </Tabs.Panel>

        <Tabs.Panel id="modules" className="pt-4 sm:pt-5">
          <ChatModuleOverridesPanel
            globalSettings={aiModules}
            value={form.moduleOverrides}
            onChange={(moduleOverrides) =>
              setForm((current) => ({ ...current, moduleOverrides }))
            }
          />
        </Tabs.Panel>

        <Tabs.Panel id="prompt" className="pt-4 sm:pt-5">
          <div className="min-w-0 space-y-3 sm:space-y-5">
            <PromptBuilder
              value={form.promptConfig}
              sets={galaxyItems.filter((item) => item.kind === 'prompt-set')}
              inheritedSetIds={inheritedPromptSetIds(form, galaxyItems)}
              activeContextFields={promptSources}
              onChange={(promptConfig) =>
                setForm((current) => ({ ...current, promptConfig }))
              }
            />
            <PromptPreviewCard
              input={promptPreviewFromChat(
                form,
                galaxyItems,
                profileName,
                messages,
                responseLanguage,
              )}
              title={t('chatSetupModal.chatPromptEstimate')}
            />
          </div>
        </Tabs.Panel>
      </Tabs>
    </UiModal>
  );
}
