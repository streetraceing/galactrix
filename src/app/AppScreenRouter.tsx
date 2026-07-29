import { ChatsScreen } from '../features/chats/ChatsScreen';
import { GalaxiesScreen } from '../features/galaxies/GalaxiesScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { TelescopeScreen } from '../features/telescope/TelescopeScreen';
import type { useAppController } from '../hooks/useAppController';

type Controller = ReturnType<typeof useAppController>;

export function AppScreenRouter({ controller }: { controller: Controller }) {
  const { activeTab, snapshot } = controller;

  if (activeTab === 'chats') {
    return (
      <ChatsScreen
        chats={snapshot.chats}
        messages={snapshot.messages}
        providers={snapshot.providers}
        galaxyItems={snapshot.galaxyItems}
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
        sending={controller.sending}
      />
    );
  }

  if (activeTab === 'galaxies') {
    return (
      <GalaxiesScreen
        items={snapshot.galaxyItems}
        onSave={controller.saveGalaxyItem}
        onDelete={controller.removeGalaxyItem}
      />
    );
  }

  if (activeTab === 'telescope') {
    return (
      <TelescopeScreen
        providers={snapshot.providers}
        onFetchModels={controller.fetchProviderModels}
        onSave={controller.saveProviderConnection}
        onCheck={controller.checkProviderConnection}
        onDelete={controller.removeProviderConnection}
      />
    );
  }

  return (
    <ProfileScreen
      usage={snapshot.usage}
      settings={snapshot.settings}
      chatCount={snapshot.chats.length}
      messageCount={snapshot.messages.length}
      providerCount={snapshot.providers.length}
      appVersion={snapshot.appVersion}
      onChangeSettings={(settings) => void controller.saveSettings(settings)}
    />
  );
}
