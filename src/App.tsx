import './App.css';
import type { ReactNode } from 'react';
import { AppScreenRouter } from './app/AppScreenRouter';
import { AppError } from './components/layout/AppError';
import { ApplicationFrame } from './components/layout/ApplicationFrame';
import { useAppController } from './hooks/useAppController';

function App() {
  const controller = useAppController();
  const frame = (children: ReactNode) => (
    <ApplicationFrame
      activeTab={controller.activeTab}
      settings={controller.snapshot.settings}
      chats={controller.snapshot.chats}
      chatCount={controller.snapshot.chats.length}
      appVersion={controller.snapshot.appVersion}
      loading={controller.loading}
      notice={controller.notice}
      onNavigate={controller.navigate}
      onOpenChat={controller.openChat}
      onCloseNotice={() => controller.setNotice('')}
      onSettingsPreview={controller.previewSettings}
      onSettingsCommit={(settings) => void controller.saveSettings(settings)}
    >
      {children}
    </ApplicationFrame>
  );

  if (controller.fatalError) {
    return frame(
      <AppError
        message={controller.fatalError}
        onRetry={() => void controller.boot()}
      />,
    );
  }

  return frame(
    !controller.loading ? <AppScreenRouter controller={controller} /> : null,
  );
}

export default App;
