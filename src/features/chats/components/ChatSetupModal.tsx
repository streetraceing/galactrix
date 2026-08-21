import {
  Button,
  Input,
  Label,
  ListBox,
  Select,
  Surface,
  Tabs,
  TextArea,
} from '@heroui/react';
import { useEffect, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { AppTabList } from '../../../components/ui/AppTabList';
import { UiModal } from '../../../components/ui/UiModal';
import { PromptPreviewCard } from '../../../components/ui/PromptPreviewCard';
import { RequiredMark } from '../../../components/ui/RequiredMark';
import { useSwipeableTabs } from '../../../hooks/useSwipeableTabs';
import { isMobilePlatform } from '../../../lib/platform';
import type {
  AiModuleSettings,
  CharacterData,
  Chat,
  ChatConfigInput,
  GalaxyItem,
  Message,
  Provider,
} from '../../../types';
import {
  activePromptSources,
  automaticChatTitle,
  chatConfigFromChat,
  createChatConfig,
  inheritedPromptSetIds,
  isChatConfigValid,
  normalizeRecentMessageLimit,
} from '../chatConfig';
import { responseLengthModes } from '../promptConfig';
import { promptPreviewFromChat } from '../promptPreview';
import { ChatContextPicker } from './ChatContextPicker';
import { ChatGenerationSettingsPanel } from './ChatGenerationSettings';
import { ChatModuleOverridesPanel } from './ChatModuleOverrides';
import { ChatProviderPicker } from './ChatProviderPicker';
import { PromptBuilder } from './PromptBuilder';
import { useTranslation } from 'react-i18next';

const CHAT_SETUP_SECTIONS = [
  'general',
  'context',
  'modules',
  'prompt',
] as const;
type ChatSetupSection = (typeof CHAT_SETUP_SECTIONS)[number];

export function ChatSetupModal({
  isOpen,
  chat,
  initialCharacterId,
  chats,
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
  initialCharacterId?: string;
  chats: Chat[];
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
  const automaticTitleBase = t('setup.automaticTitleBase');
  const [form, setForm] = useState<ChatConfigInput>(() =>
    createChatConfig(defaultTitle),
  );
  const [recentLimitDraft, setRecentLimitDraft] = useState('');
  const [customTitle, setCustomTitle] = useState(
    chat ? !chat.autoTitle : false,
  );
  const [greetingCustomized, setGreetingCustomized] = useState(Boolean(chat));
  const [section, setSection] = useState<ChatSetupSection>('general');
  const swipeRef = useSwipeableTabs({
    keys: CHAT_SETUP_SECTIONS,
    selectedKey: section,
    onSelectionChange: setSection,
  });

  useEffect(() => {
    if (!isOpen) return;
    const initialCharacter = galaxyItems.find(
      (item) => item.kind === 'character' && item.id === initialCharacterId,
    );
    const nextForm = chat
      ? chatConfigFromChat(chat)
      : {
          ...createChatConfig(defaultTitle),
          characterId: initialCharacterId,
          greetingMessage:
            (initialCharacter?.data as CharacterData | undefined)
              ?.greetingMessage ?? '',
        };
    setForm(nextForm);
    setCustomTitle(chat ? !chat.autoTitle : false);
    setGreetingCustomized(Boolean(chat));
    setSection('general');
    setRecentLimitDraft(String(nextForm.promptConfig.recentMessageLimit ?? 50));
  }, [chat, defaultTitle, galaxyItems, initialCharacterId, isOpen]);

  const usesAutomaticTitle = !customTitle;
  const automaticTitle = automaticChatTitle(
    form.characterId,
    chats,
    galaxyItems,
    chat?.id,
    automaticTitleBase,
  );
  const canSubmit =
    isChatConfigValid(form, { allowEmptyTitle: usesAutomaticTitle }) && !saving;
  const submit = () => {
    if (!canSubmit) return;
    const greetingMessage = form.greetingMessage?.trim();
    onSubmit({
      ...form,
      autoTitle: usesAutomaticTitle,
      automaticTitleBase,
      title: usesAutomaticTitle ? '' : form.title.trim(),
      greetingMessage: greetingMessage || undefined,
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
      <div ref={swipeRef} className="tab-swipe-host min-w-0 touch-pan-y">
        <Tabs
          selectedKey={section}
          onSelectionChange={(key) =>
            setSection(String(key) as ChatSetupSection)
          }
          className="w-full min-w-0"
        >
          <AppTabList
            label={t('chatSetupModal.sections')}
            items={[
              { id: 'general', label: t('chatSetupModal.general') },
              { id: 'context', label: t('chatSetupModal.context') },
              { id: 'modules', label: t('chatSetupModal.modules') },
              { id: 'prompt', label: t('chatSetupModal.prompt') },
            ]}
          />

          <Tabs.Panel id="general" className="pt-4 sm:pt-5">
            <div className="min-w-0 space-y-3 sm:space-y-4">
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
                {customTitle ? (
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="chat-title">
                        {t('chatSetupModal.name')}
                        <RequiredMark />
                      </Label>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                      <Input
                        id="chat-title"
                        required
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
                      <Button
                        size="sm"
                        variant="tertiary"
                        onPress={() => {
                          setCustomTitle(false);
                          setForm((current) => ({
                            ...current,
                            autoTitle: true,
                          }));
                        }}
                        className="min-h-10 w-full shrink-0 rounded-lg sm:w-auto"
                      >
                        {t('chatSetupModal.useAutomaticTitle')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Surface className="flex min-w-0 flex-col items-stretch gap-3 rounded-xl border border-separator bg-surface-secondary/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                        <Icon name="sparkles" className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted">
                          {t('chatSetupModal.automaticTitle')}
                        </p>
                        <p className="truncate text-sm font-semibold">
                          {automaticTitle}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="tertiary"
                      className="w-full shrink-0 sm:w-auto"
                      onPress={() => {
                        setCustomTitle(true);
                        setForm((current) => ({
                          ...current,
                          autoTitle: false,
                          title:
                            current.title === defaultTitle ? '' : current.title,
                        }));
                      }}
                    >
                      {t('chatSetupModal.setCustomTitle')}
                    </Button>
                  </Surface>
                )}
                <ChatProviderPicker
                  providers={providers}
                  value={form.providerId}
                  onChange={(providerId) =>
                    setForm((current) => ({ ...current, providerId }))
                  }
                />
              </div>
              {usesAutomaticTitle ? (
                <p className="text-xs leading-5 text-muted">
                  {t('chatSetupModal.automaticTitleDescription')}
                </p>
              ) : null}

              <div className="flex min-w-0 flex-col gap-1.5">
                <Select
                  fullWidth
                  variant="secondary"
                  value={form.promptConfig.responseLength ?? 'auto'}
                  onChange={(key) => {
                    const selected = Array.isArray(key) ? key[0] : key;
                    if (selected == null) return;
                    const responseLength = String(selected) as
                      'auto' | 'micro' | 'short' | 'long';
                    setForm((current) => ({
                      ...current,
                      promptConfig: {
                        ...current.promptConfig,
                        responseLength,
                      },
                    }));
                  }}
                >
                  <Label>{t('chatSetupModal.responseLength')}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {responseLengthModes.map((option) => (
                        <ListBox.Item
                          key={option.id}
                          id={option.id}
                          textValue={t(option.labelKey)}
                        >
                          <span className="min-w-0 flex-1">
                            <strong className="block text-sm">
                              {t(option.labelKey)}
                            </strong>
                            <span className="mt-0.5 block text-xs leading-5 text-muted">
                              {t(option.descriptionKey)}
                            </span>
                          </span>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <p className="text-xs leading-5 text-muted">
                  {t('chatSetupModal.responseLengthDescription')}
                </p>
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

              <ChatGenerationSettingsPanel
                value={form.generationSettings}
                provider={providers.find(
                  (provider) => provider.id === form.providerId,
                )}
                onChange={(generationSettings) =>
                  setForm((current) => ({
                    ...current,
                    generationSettings,
                  }))
                }
              />

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
                  onChange={(event) => {
                    setGreetingCustomized(true);
                    setForm((current) => ({
                      ...current,
                      greetingMessage: event.target.value,
                    }));
                  }}
                />
                <p className="text-xs leading-5 text-muted">
                  {t('chatSetupModal.greetingMessageDescription')}
                </p>
              </div>
            </div>
          </Tabs.Panel>

          <Tabs.Panel id="context" className="pt-4 sm:pt-5">
            <ChatContextPicker
              galaxyItems={galaxyItems}
              value={form}
              onChange={(nextForm) => {
                if (
                  nextForm.characterId !== form.characterId &&
                  !greetingCustomized
                ) {
                  const character = galaxyItems.find(
                    (item) =>
                      item.kind === 'character' &&
                      item.id === nextForm.characterId,
                  );
                  nextForm = {
                    ...nextForm,
                    greetingMessage:
                      (character?.data as CharacterData | undefined)
                        ?.greetingMessage ?? '',
                  };
                }
                setForm(nextForm);
              }}
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
                  aiModules,
                )}
                title={t('chatSetupModal.chatPromptEstimate')}
              />
            </div>
          </Tabs.Panel>
        </Tabs>
      </div>
    </UiModal>
  );
}
