import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('shared page and collection typography wraps unbroken user content', () => {
  const css = read('src/App.css');
  for (const selector of [
    'page-title',
    'page-description',
    'section-title',
    'section-description',
    'collection-card__title',
    'collection-card__description',
  ]) {
    assert.match(css, new RegExp(`\\.${selector}\\s*\\{[^}]*wrap-anywhere`));
  }
  const mobile = css.slice(css.indexOf('@media (max-width: 820px)'));
  assert.match(mobile, /\.page-header-copy\s*\{[^}]*h-auto min-h-22/);
  assert.doesNotMatch(mobile, /\.page-header-copy\s*\{[^}]*max-h-/);
  assert.doesNotMatch(mobile, /\.page-description\s*\{[^}]*line-clamp/);
  assert.match(
    css,
    /\.page-header-actions > \.button[^}]*whitespace-normal wrap-anywhere/,
  );
});

test('modal headings and descriptions stay fully readable with scrollable stacked actions', () => {
  const modal = read('src/components/ui/UiModal.tsx');
  assert.doesNotMatch(modal, /line-clamp-/);
  assert.match(modal, /Modal.Heading className="min-w-0 wrap-anywhere"/);
  assert.match(
    modal,
    /ui-modal-mobile-header[^"\n]*max-h-\[40%\][^"\n]*overflow-y-auto/,
  );
  assert.match(
    modal,
    /ui-modal-mobile-footer[^"\n]*flex-col[^"\n]*overflow-y-auto/,
  );
  assert.match(modal, /sm:flex-row/);
  assert.match(modal, /\[&>button\]:whitespace-normal/);
});

test('selection surfaces wrap internally without shrinking touch targets', () => {
  const toolbar = read('src/components/ui/ContextSelectionToolbar.tsx');
  assert.match(toolbar, /min-w-0 max-w-full flex-wrap justify-center/);
  assert.match(toolbar, /min-w-0 wrap-anywhere py-2/);
  assert.doesNotMatch(toolbar, /flex h-12/);
  assert.match(toolbar, /size-10 min-w-10/);
});

test('detail views expose full identifiers and markdown keeps local scrollers', () => {
  for (const path of [
    'src/components/ui/ExportOptions.tsx',
    'src/features/telescope/components/ProviderCard.tsx',
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /truncate/);
    assert.match(source, /wrap-anywhere/);
  }
  const overview = read(
    'src/features/chats/components/ConversationHeader.tsx',
  ).split('function ConversationHeader')[0];
  assert.match(overview, /grid grid-cols-1 gap-2 sm:grid-cols-2/);
  assert.match(
    read('src/features/settings/components/SnippetsPanel.tsx'),
    /max-w-full wrap-anywhere text-sm font-semibold/,
  );
  const markdown = read('src/components/ui/MarkdownContent.tsx');
  assert.match(markdown, /min-w-0 max-w-full wrap-anywhere/);
  assert.match(markdown, /<pre className="[^"\n]*overflow-x-auto/);
  assert.match(markdown, /<table className="w-full min-w-max/);
  const switches = read('src/features/profile/components/SettingSwitchRow.tsx');
  assert.match(switches, /block wrap-anywhere text-sm/);
  assert.doesNotMatch(switches, /min-h-0 overflow-hidden/);
});

test('collection metadata and section actions cannot squeeze the main copy to zero', () => {
  const css = read('src/App.css');
  assert.match(
    css,
    /\.collection-card__metadata\s*\{[^}]*min-w-0 max-w-full wrap-anywhere[^}]*sm:max-w-\[40%\]/,
  );
  assert.match(
    css,
    /\.section-header__actions\s*\{[^}]*min-w-0 max-w-full[^}]*sm:max-w-\[50%\]/,
  );
  assert.match(css, /\.collection-card \.chip__label\s*\{[^}]*wrap-anywhere/);
  assert.match(
    read('src/components/ui/MetricGrid.tsx'),
    /block wrap-anywhere text-xl/,
  );
  assert.match(
    read('src/features/settings/components/SnippetsPanel.tsx'),
    /max-w-full flex-wrap items-center gap-1/,
  );
});

test('search and chat preference controls support large text on narrow phones', () => {
  assert.match(
    read('src/App.css'),
    /\.search-field__input\s*\{[^}]*min-w-0 max-w-full/,
  );
  const preferences = read(
    'src/features/profile/components/ChatPreferences.tsx',
  );
  assert.match(preferences, /messageLayouts\.map/);
  assert.match(preferences, /whitespace-normal wrap-anywhere/);
  assert.doesNotMatch(preferences, /truncate/);
  assert.match(
    read('src/features/chats/components/ChatSidebar.tsx'),
    /mt-1 wrap-anywhere text-xs/,
  );
  assert.match(
    read('src/features/profile/components/ProfilePreferences.tsx'),
    /min-h-11 whitespace-normal wrap-anywhere/,
  );
  assert.match(
    read('src/features/profile/components/AppInfo.tsx'),
    /flex-wrap items-center/,
  );
});
