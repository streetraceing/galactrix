import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { mergeExpandedLayoutViewport } from '../../src/lib/mobileViewport.ts';

const pageHeaderPath = new URL(
  '../../src/components/ui/PageHeader.tsx',
  import.meta.url,
);
const appCssPath = new URL('../../src/App.css', import.meta.url);
const settingsCardPath = new URL(
  '../../src/features/profile/components/SettingsCard.tsx',
  import.meta.url,
);
const chatPreferencesPath = new URL(
  '../../src/features/profile/components/ChatPreferences.tsx',
  import.meta.url,
);
const usageTimelinePath = new URL(
  '../../src/features/profile/components/UsageTimeline.tsx',
  import.meta.url,
);
const moduleFieldsPath = new URL(
  '../../src/features/settings/components/ModuleFields.tsx',
  import.meta.url,
);
const applicationFramePath = new URL(
  '../../src/components/layout/ApplicationFrame.tsx',
  import.meta.url,
);
const mobileKeyboardPath = new URL(
  '../../src/hooks/useMobileKeyboardVisibility.ts',
  import.meta.url,
);
const stableViewportPath = new URL(
  '../../src/hooks/useStableMobileLayoutViewport.ts',
  import.meta.url,
);

test('expanded mobile viewport does not collapse with the keyboard', () => {
  assert.deepEqual(
    mergeExpandedLayoutViewport(
      { width: 412, height: 915 },
      { width: 412, height: 503 },
    ),
    { width: 412, height: 915 },
  );
  assert.deepEqual(
    mergeExpandedLayoutViewport(
      { width: 412, height: 915 },
      { width: 915, height: 412 },
    ),
    { width: 915, height: 412 },
  );
});

test('mobile page headers share one compact centered title area', async () => {
  const [componentSource, cssSource] = await Promise.all([
    readFile(pageHeaderPath, 'utf8'),
    readFile(appCssPath, 'utf8'),
  ]);

  assert.doesNotMatch(componentSource, /h-52/);
  assert.match(componentSource, /page-header-copy/);
  assert.match(componentSource, /text-center md:text-left/);
  assert.match(
    cssSource,
    /\.page-header-copy\s*\{[\s\S]*?@apply h-22 min-h-22 max-h-22/,
  );
  assert.match(
    cssSource,
    /\.page-description\s*\{[\s\S]*?@apply[^;]*text-center/,
  );
});

test('mobile settings constrain intrinsic widths', async () => {
  const [cssSource, cardSource, chatSource] = await Promise.all([
    readFile(appCssPath, 'utf8'),
    readFile(settingsCardPath, 'utf8'),
    readFile(chatPreferencesPath, 'utf8'),
  ]);

  assert.match(
    cssSource,
    /\.page-container\s*\{[\s\S]*?min-w-0[\s\S]*?max-w-full[\s\S]*?overflow-x-clip/,
  );
  assert.match(cardSource, /w-full min-w-0 max-w-full overflow-hidden/);
  assert.match(chatSource, /grid grid-cols-1 gap-2 sm:grid-cols-2/);
  assert.match(
    chatSource,
    /className="min-w-0 max-w-full"|className="w-full min-w-0 max-w-full"/,
  );
});

test('usage statistic chips stack before the desktop breakpoint', async () => {
  const source = await readFile(usageTimelinePath, 'utf8');

  assert.match(source, /flex flex-col gap-2[^"']*sm:flex-row/);
  assert.match(source, /w-full justify-center[^"']*sm:flex-1/);
});

test('mobile page headers are explicitly non-sticky', async () => {
  const cssSource = await readFile(appCssPath, 'utf8');

  assert.match(
    cssSource,
    /@media \(max-width: 820px\)[\s\S]*?\.page-header\s*\{[\s\S]*?@apply static! inset-auto!/,
  );
});

test('mobile settings keep field rings visible and number drafts editable', async () => {
  const source = await readFile(moduleFieldsPath, 'utf8');

  assert.match(source, /const \[draft, setDraft\] = useState/);
  assert.match(source, /value=\{draft\}/);
  assert.match(source, /rawValue\.trim\(\) !== ''/);
  assert.match(source, /onBlur=\{commitDraft\}/);
  assert.doesNotMatch(source, /Number\(event\.target\.value\)/);
  assert.match(source, /-mx-1 min-h-0 overflow-hidden px-1 sm:mx-0 sm:px-0/);
});

test('mobile layout tracks the expanded viewport and hides navigation for the keyboard', async () => {
  const [frame, keyboard, stableViewport] = await Promise.all([
    readFile(applicationFramePath, 'utf8'),
    readFile(mobileKeyboardPath, 'utf8'),
    readFile(stableViewportPath, 'utf8'),
  ]);

  assert.match(frame, /useStableMobileLayoutViewport\(isMobile\)/);
  assert.match(frame, /useMobileKeyboardVisibility\(isMobile\)/);
  assert.match(frame, /mobileNavigationVisible && !mobileKeyboardVisible/);
  assert.match(keyboard, /isKeyboardInput\(document\.activeElement\)/);
  assert.match(keyboard, /baselineHeight - currentHeight > threshold/);
  assert.match(keyboard, /viewport\?\.addEventListener\('resize', update\)/);
  assert.match(stableViewport, /rememberExpandedLayoutViewport\(\)/);
  assert.match(stableViewport, /visualViewport\?\.addEventListener\('resize'/);
});

test('chat configuration keeps prompt details compact but context immediately usable', async () => {
  const [builder, contextPicker, setup, galaxyEditor] = await Promise.all([
    readFile(
      new URL(
        '../../src/features/chats/components/PromptBuilder.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../../src/features/chats/components/ChatContextPicker.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../../src/features/chats/components/ChatSetupModal.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../../src/features/galaxies/components/GalaxyEditorModal.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  assert.match(builder, /useMediaQuery\('\(max-width: 820px\)'\)/);
  assert.match(builder, /if \(isCompactLayout\) return \[\];/);
  assert.match(builder, /expandedKeys=\{expandedKeys\}/);
  assert.match(builder, /onExpandedChange=\{setExpandedKeys\}/);
  assert.match(
    contextPicker,
    /const \[expanded, setExpanded\] = useState\(true\)/,
  );
  assert.match(
    contextPicker,
    /if \(isOpen && isCompactLayout\) setExpanded\(true\)/,
  );
  assert.match(contextPicker, /!isCompactLayout \|\| expanded/);
  assert.match(contextPicker, /chatContextPicker\.expand/);
  assert.match(setup, /space-y-3 sm:space-y-5/);
  assert.doesNotMatch(galaxyEditor, /min-h-48/);
  assert.match(galaxyEditor, /min-h-20 sm:min-h-24/);
});

test('chat recent-message limit keeps an editable text draft', async () => {
  const source = await readFile(
    new URL(
      '../../src/features/chats/components/ChatSetupModal.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(
    source,
    /const \[recentLimitDraft, setRecentLimitDraft\] = useState/,
  );
  assert.match(source, /if \(rawValue\.trim\(\) === ''\) return/);
  assert.match(source, /onBlur=\{\(\) =>/);
});

test('character style settings stay vertical and explain each preset', async () => {
  const [editorSource, modelSource] = await Promise.all([
    readFile(
      new URL(
        '../../src/features/galaxies/components/editors/CharacterEditor.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL('../../src/features/galaxies/model.ts', import.meta.url),
      'utf8',
    ),
  ]);

  assert.match(editorSource, /<div className="flex flex-col gap-3">/);
  assert.doesNotMatch(editorSource, /grid gap-4 sm:grid-cols-2/);
  assert.match(editorSource, /preset\.descriptionKey/);
  assert.doesNotMatch(editorSource, /selectedStylePreset\.descriptionKey/);
  assert.match(editorSource, /savedStyleDescription/);
  assert.match(editorSource, /preset\.id !== 'custom'/);
  assert.match(
    modelSource,
    /descriptionKey: 'style\.description\.telegramHuman'/,
  );
  assert.match(modelSource, /descriptionKey: 'style\.description\.custom'/);
});

test('metric cards reserve a little more bottom space on phones', async () => {
  const source = await readFile(
    new URL('../../src/components/ui/MetricGrid.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /className={`metric-enter min-w-0 p-5/);
});
