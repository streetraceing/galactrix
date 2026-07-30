import {
  Label,
  ListBox,
  Select,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import type { Key } from 'react';
import { Icon } from '../../../components/Icon';
import type { AppSettings } from '../../../types';
import { SettingsCard } from './SettingsCard';
import { SettingSwitchRow } from './SettingSwitchRow';
import { useTranslation } from 'react-i18next';

export function ChatPreferences({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
}) {
  const { t } = useTranslation('profile');

  return (
    <SettingsCard
      icon="chats"
      title={t('profileOverview.chats')}
      description={t('profilePreferences.chatAppearanceAndBehavior')}
    >
      <div className="py-3 first:pt-0">
        <strong className="block text-sm font-medium">
          {t('profilePreferences.messageLayout')}
        </strong>
        <p className="mt-1 text-xs leading-5 text-muted">
          {t('profilePreferences.messageLayoutDescription')}
        </p>
        <ToggleButtonGroup
          fullWidth
          isDetached
          disallowEmptySelection
          selectionMode="single"
          selectedKeys={new Set([settings.chatViewMode])}
          className="mt-3 flex gap-2"
          onSelectionChange={(keys) => {
            const value = [...keys][0];
            if (value === 'conversation' || value === 'messenger') {
              onChange('chatViewMode', value);
            }
          }}
        >
          <ToggleButton
            id="conversation"
            variant="ghost"
            className="h-auto min-w-0 justify-start gap-3 rounded-xl px-3 py-2.5 text-left"
          >
            <Icon name="chats" className="size-4 shrink-0" />
            <span className="min-w-0">
              <strong className="block truncate text-sm">
                {t('profilePreferences.conversationLayout')}
              </strong>
              <span className="block truncate text-xs opacity-70">
                {t('profilePreferences.conversationLayoutHint')}
              </span>
            </span>
          </ToggleButton>
          <ToggleButton
            id="messenger"
            variant="ghost"
            className="h-auto min-w-0 justify-start gap-3 rounded-xl px-3 py-2.5 text-left"
          >
            <Icon name="message_box" className="size-4 shrink-0" />
            <span className="min-w-0">
              <strong className="block truncate text-sm">
                {t('profilePreferences.messengerLayout')}
              </strong>
              <span className="block truncate text-xs opacity-70">
                {t('profilePreferences.messengerLayoutHint')}
              </span>
            </span>
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      <SettingSwitchRow
        label={t('profilePreferences.showMessageAvatars')}
        description={t('profilePreferences.showMessageAvatarsDescription')}
        value={settings.showMessageAvatars}
        onChange={(value) => onChange('showMessageAvatars', value)}
      />
      <SettingSwitchRow
        label={t('profilePreferences.showMessageTimestamps')}
        description={t('profilePreferences.showMessageTimestampsDescription')}
        value={settings.showMessageTimestamps}
        onChange={(value) => onChange('showMessageTimestamps', value)}
      />
      <SettingSwitchRow
        label={t('profilePreferences.enterSendsMessage')}
        description={t('profilePreferences.shiftEnterInsertsANewLine')}
        value={settings.sendOnEnter}
        onChange={(value) => onChange('sendOnEnter', value)}
      />
      <SettingSwitchRow
        label={t('profilePreferences.saveDrafts')}
        description={t('profilePreferences.aSeparateDraftForEachChat')}
        value={settings.saveDrafts}
        onChange={(value) => onChange('saveDrafts', value)}
      />

      <div className="flex flex-col gap-1.5 pt-3">
        <Label>{t('profilePreferences.responseLanguage')}</Label>
        <p className="text-xs leading-5 text-muted">
          {t('profilePreferences.responseLanguageDescription')}
        </p>
        <Select
          fullWidth
          variant="secondary"
          value={settings.responseLanguage}
          aria-label={t('profilePreferences.responseLanguage')}
          onChange={(key: Key | Key[] | null) => {
            if (key === 'app' || key === 'auto') {
              onChange('responseLanguage', key);
            }
          }}
        >
          <Select.Trigger className="mt-1">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item
                id="app"
                textValue={t('profilePreferences.appLanguage')}
              >
                <div>
                  <strong className="block text-sm">
                    {t('profilePreferences.appLanguage')}
                  </strong>
                  <span className="text-xs text-muted">
                    {t('profilePreferences.appLanguageHint')}
                  </span>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item
                id="auto"
                textValue={t('profilePreferences.autoResponseLanguage')}
              >
                <div>
                  <strong className="block text-sm">
                    {t('profilePreferences.autoResponseLanguage')}
                  </strong>
                  <span className="text-xs text-muted">
                    {t('profilePreferences.autoResponseLanguageHint')}
                  </span>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
    </SettingsCard>
  );
}
