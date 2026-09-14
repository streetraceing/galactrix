import { ChatsScreen } from '../features/chats/ChatsScreen';
import { SetupWizard } from '../features/setup/SetupWizard';
import { GalaxiesScreen } from '../features/galaxies/GalaxiesScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { TelescopeScreen } from '../features/telescope/TelescopeScreen';
import type { useAppController } from './useAppController';
import { getResponseLocale } from '../i18n';

type Controller = ReturnType<typeof useAppController>;

export function AppScreenRouter({
  controller,
  chatMaximized,
  onChatMaximizedChange,
}: {
  controller: Controller;
  chatMaximized: boolean;
  onChatMaximizedChange: (maximized: boolean) => void;
}) {
  const { activeTab, snapshot } = controller;

  // First-run setup: shown until the wizard is completed or skipped.
  if (!snapshot.settings.setupComplete) {
    return (
      <SetupWizard
        settings={snapshot.settings}
        providers={snapshot.providers}
        onChangeSettings={controller.saveSettings}
        onFetchModels={controller.fetchProviderModels}
        onTestEmbeddings={controller.testProviderEmbeddingConnection}
        onSaveProvider={controller.saveProviderConnection}
      />
    );
  }

  if (activeTab === 'chats') {
    return (
      <ChatsScreen
        chats={snapshot.chats}
        messages={snapshot.messages}
        providers={snapshot.providers}
        galaxyItems={snapshot.galaxyItems}
        aiModules={snapshot.settings.aiModules}
        profileName={snapshot.settings.profileName}
        profileAvatar={snapshot.settings.profileAvatar}
        activeChatId={controller.activeChatId}
        isChatOpen={controller.isChatOpen}
        chatListRequest={controller.chatListRequest}
        chatMaximized={chatMaximized}
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
        onChatMaximizedChange={onChatMaximizedChange}
        onNewChat={controller.createNewChat}
        onUpdateChat={controller.updateExistingChat}
        onRenameChat={controller.renameExistingChat}
        onDeleteChat={controller.removeChat}
        onSetPinned={controller.pinChat}
        onSetArchived={controller.archiveChat}
        onAssignTags={controller.assignTagsToChats}
        onClearChat={controller.clearExistingChat}
        onCloneChat={controller.cloneExistingChat}
        onBranchMessage={controller.branchFromMessage}
        onEditMessage={controller.editExistingMessage}
        onDeleteMessage={controller.removeMessage}
        onDeleteMessages={controller.removeMessages}
        onRewindMessage={controller.rewindToMessage}
        onRememberMessage={controller.rememberMessage}
        onRegenerateMessage={controller.regenerateExistingMessage}
        onContinueMessage={controller.continueExistingMessage}
        onSelectMessageVariant={controller.chooseMessageVariant}
        onRateMessageVariant={controller.rateMessageVariantFeedback}
        onTranslateMessage={controller.translateMessage}
        onListMessageRevisions={(messageId) =>
          controller.listRevisions('message', messageId)
        }
        onRestoreMessageRevision={controller.restoreMessageRevision}
        onSend={controller.sendMessage}
        onCancelGeneration={controller.cancelChatGeneration}
        snippets={snapshot.settings.snippets}
        onExportBackup={() => controller.createFullAppBackup(false)}
        sendOnEnter={snapshot.settings.sendOnEnter}
        focusComposerAfterSend={snapshot.settings.focusComposerAfterSend}
        saveDrafts={snapshot.settings.saveDrafts}
        chatViewMode={snapshot.settings.chatViewMode}
        showMessageAvatars={snapshot.settings.showMessageAvatars}
        showMessageTimestamps={snapshot.settings.showMessageTimestamps}
        responseLanguage={getResponseLocale(snapshot.settings.responseLanguage)}
        generationJobs={controller.generationJobs}
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
        onListRevisions={(entityId) =>
          controller.listRevisions('galaxy', entityId)
        }
        onRestoreRevision={controller.restoreGalaxyRevision}
        onListFeedback={(entityId) => controller.listVariantFeedback(entityId)}
      />
    );
  }

  if (activeTab === 'telescope') {
    return (
      <TelescopeScreen
        providers={snapshot.providers}
        onFetchModels={controller.fetchProviderModels}
        onTestEmbeddings={controller.testProviderEmbeddingConnection}
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
        providers={snapshot.providers}
        appVersion={snapshot.appVersion}
        onChangeSettings={controller.saveSettings}
        generationActive={controller.generationJobs.length > 0}
        onCreateBackup={controller.createFullAppBackup}
        onInspectBackup={controller.inspectFullAppBackup}
        onRestoreBackup={controller.restoreFullAppBackup}
        onRunDiagnostics={controller.runHealthDiagnostics}
        onRepairIssues={controller.repairHealthIssues}
      />
    );
  }

  return (
    <ProfileScreen
      usage={snapshot.usage}
      settings={snapshot.settings}
      galaxyItems={snapshot.galaxyItems}
      providers={snapshot.providers}
      chatCount={snapshot.chats.length}
      messageCount={snapshot.messages.length}
      providerCount={snapshot.providers.length}
      onGetBudgetStatus={controller.getBudgetStatus}
      onChangeSettings={controller.saveSettings}
      onSaveGalaxyItem={controller.saveGalaxyItem}
    />
  );
}
