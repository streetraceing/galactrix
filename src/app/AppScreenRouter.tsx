import { ChatsScreen } from '../features/chats/ChatsScreen';
import { GalaxiesScreen } from '../features/galaxies/GalaxiesScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { TelescopeScreen } from '../features/telescope/TelescopeScreen';
import type { useAppController } from '../hooks/useAppController';
import { useTranslation } from 'react-i18next';

type Controller = ReturnType<typeof useAppController>;

export function AppScreenRouter({ controller }: { controller: Controller }) {
  const { activeTab, snapshot } = controller;
  const { i18n } = useTranslation();

  if (activeTab === 'chats') {
    return (
      <ChatsScreen
        chats={snapshot.chats}
        messages={snapshot.messages}
        providers={snapshot.providers}
        galaxyItems={snapshot.galaxyItems}
        profileName={snapshot.settings.profileName}
        profileAvatar={snapshot.settings.profileAvatar}
        activeChatId={controller.activeChatId}
        isChatOpen={controller.isChatOpen}
        chatSidebarWidth={snapshot.settings.chatSidebarWidth}
        onChatSidebarWidthPreview={(chatSidebarWidth) =>
          controller.previewSettings({ ...snapshot.settings, chatSidebarWidth })
        }
        onChatSidebarWidthCommit={(chatSidebarWidth) =>
          void controller.saveSettings({
            ...snapshot.settings,
            chatSidebarWidth,
          })
        }
        onSelectChat={controller.openChat}
        onCloseChat={controller.closeChat}
        onNewChat={controller.createNewChat}
        onUpdateChat={controller.updateExistingChat}
        onRenameChat={controller.renameExistingChat}
        onDeleteChat={controller.removeChat}
        onSetPinned={controller.pinChat}
        onClearChat={controller.clearExistingChat}
        onCloneChat={controller.cloneExistingChat}
        onBranchMessage={controller.branchFromMessage}
        onEditMessage={controller.editExistingMessage}
        onDeleteMessage={controller.removeMessage}
        onRememberMessage={controller.rememberMessage}
        onRegenerateMessage={controller.regenerateExistingMessage}
        onSelectMessageVariant={controller.chooseMessageVariant}
        onSend={controller.sendMessage}
        sendOnEnter={snapshot.settings.sendOnEnter}
        saveDrafts={snapshot.settings.saveDrafts}
        chatViewMode={snapshot.settings.chatViewMode}
        showMessageAvatars={snapshot.settings.showMessageAvatars}
        showMessageTimestamps={snapshot.settings.showMessageTimestamps}
        responseLanguage={
          snapshot.settings.responseLanguage === 'app'
            ? i18n.resolvedLanguage?.toLowerCase().startsWith('ru')
              ? 'ru'
              : 'en'
            : undefined
        }
        sending={controller.sending}
      />
    );
  }

  if (activeTab === 'galaxies') {
    return (
      <GalaxiesScreen
        items={snapshot.galaxyItems}
        onSave={controller.saveGalaxyItem}
        onImport={controller.importGalaxyLibrary}
        onDelete={controller.removeGalaxyItem}
      />
    );
  }

  if (activeTab === 'telescope') {
    return (
      <TelescopeScreen
        providers={snapshot.providers}
        onFetchModels={controller.fetchProviderModels}
        onExportSecrets={controller.exportProviderSecrets}
        onImport={controller.importProviders}
        onSave={controller.saveProviderConnection}
        onCheck={controller.checkProviderConnection}
        onDelete={controller.removeProviderConnection}
      />
    );
  }

  if (activeTab === 'settings') {
    return (
      <SettingsScreen
        settings={snapshot.settings}
        appVersion={snapshot.appVersion}
        onChangeSettings={controller.saveSettings}
      />
    );
  }

  return (
    <ProfileScreen
      usage={snapshot.usage}
      settings={snapshot.settings}
      galaxyItems={snapshot.galaxyItems}
      chatCount={snapshot.chats.length}
      messageCount={snapshot.messages.length}
      providerCount={snapshot.providers.length}
      onChangeSettings={controller.saveSettings}
      onSaveGalaxyItem={controller.saveGalaxyItem}
    />
  );
}
