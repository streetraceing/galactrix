import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appPath = new URL('../../src/App.tsx', import.meta.url);
const framePath = new URL(
  '../../src/components/layout/ApplicationFrame.tsx',
  import.meta.url,
);
const chatsScreenPath = new URL(
  '../../src/features/chats/ChatsScreen.tsx',
  import.meta.url,
);
const conversationHeaderPath = new URL(
  '../../src/features/chats/components/ConversationHeader.tsx',
  import.meta.url,
);
const messageListPath = new URL(
  '../../src/features/chats/components/MessageList.tsx',
  import.meta.url,
);
const composerPath = new URL(
  '../../src/features/chats/components/ChatComposer.tsx',
  import.meta.url,
);

test('desktop chat maximize mode hides both sidebars and widens centered chat content', async () => {
  const [app, frame, chats, header, messages, composer] = await Promise.all([
    readFile(appPath, 'utf8'),
    readFile(framePath, 'utf8'),
    readFile(chatsScreenPath, 'utf8'),
    readFile(conversationHeaderPath, 'utf8'),
    readFile(messageListPath, 'utf8'),
    readFile(composerPath, 'utf8'),
  ]);

  assert.match(
    app,
    /const \[chatMaximized, setChatMaximized\] = useState\(false\)/,
  );
  assert.match(frame, /activeTab === 'chats' && chatMaximized/);
  assert.match(frame, /!isMobile && !hideDesktopNavigation/);
  assert.match(chats, /!chatMaximized \? \([\s\S]*<ChatSidebar/);
  assert.match(chats, /!isSinglePane && !chatMaximized/);
  assert.match(header, /conversationHeader\.maximizeChat/);
  assert.match(header, /aria-pressed=\{maximized\}/);
  assert.match(header, /name=\{maximized \? 'screen-normal' : 'screen-full'\}/);
  assert.match(messages, /wide \? 'max-w-5xl' : 'max-w-3xl'/);
  assert.match(composer, /wide \? 'max-w-5xl' : 'max-w-3xl'/);
});
