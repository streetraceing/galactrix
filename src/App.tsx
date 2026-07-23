import './App.css';
import { AppScreenRouter } from './app/AppScreenRouter';
import { AppError } from './components/layout/AppError';
import { ApplicationFrame } from './components/layout/ApplicationFrame';
import { useAppController } from './hooks/useAppController';

function App() {
  const controller = useAppController();

  if (controller.fatalError) {
    return (
      <AppError
        message={controller.fatalError}
        onRetry={() => void controller.boot()}
      />
    );
  }

  return (
    <ApplicationFrame
      activeTab={controller.activeTab}
      settings={controller.snapshot.settings}
      chatCount={controller.snapshot.chats.length}
      appVersion={controller.snapshot.appVersion}
      loading={controller.loading}
      notice={controller.notice}
      onNavigate={controller.navigate}
      onCloseNotice={() => controller.setNotice('')}
      onSettingsPreview={controller.previewSettings}
      onSettingsCommit={(settings) => void controller.saveSettings(settings)}
    >
      {!controller.loading ? <AppScreenRouter controller={controller} /> : null}
    </ApplicationFrame>
  );
}

export default App;
