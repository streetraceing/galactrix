import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { isSnippetDraftValid } from '../../src/features/settings/components/SnippetsPanel';
import { budgetUsageForRule } from '../../src/features/profile/components/BudgetsPanel';
import { TranslateMessageModal } from '../../src/features/chats/components/TranslateMessageModal';
import type { BudgetSettings, BudgetStatus, Message } from '../../src/types';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');
const snippetsPath = 'src/features/settings/components/SnippetsPanel.tsx';
const wizardPath = 'src/features/setup/SetupWizard.tsx';
const translatePath = 'src/features/chats/components/TranslateMessageModal.tsx';
const budgetsPath = 'src/features/profile/components/BudgetsPanel.tsx';

const rule: BudgetSettings = {
  id: 'rule-1',
  period: 'day',
  tokenLimit: 100,
  requestLimit: 10,
};
const status: BudgetStatus = {
  ...rule,
  ruleId: rule.id,
  usedTokens: 0,
  usedRequests: 0,
  exceeded: false,
};

test('snippet validation preserves whitespace rules and both length boundaries', () => {
  const draft = { id: 'snippet-1', title: ' Name ', content: ' Content ' };
  assert.equal(isSnippetDraftValid(null), false);
  assert.equal(isSnippetDraftValid(draft), true);
  assert.equal(isSnippetDraftValid({ ...draft, title: ' \n ' }), false);
  assert.equal(isSnippetDraftValid({ ...draft, content: '\n\t' }), false);
  assert.equal(
    isSnippetDraftValid({
      ...draft,
      title: 'x'.repeat(80),
      content: 'x'.repeat(12_000),
    }),
    true,
  );
  assert.equal(isSnippetDraftValid({ ...draft, title: 'x'.repeat(81) }), false);
  assert.equal(
    isSnippetDraftValid({ ...draft, content: 'x'.repeat(12_001) }),
    false,
  );
  assert.deepEqual(draft, {
    id: 'snippet-1',
    title: ' Name ',
    content: ' Content ',
  });
});

test('budget usage distinguishes unknown from a confirmed zero', () => {
  assert.equal(budgetUsageForRule({ phase: 'loading' }, rule), undefined);
  assert.equal(
    budgetUsageForRule({ phase: 'error', detail: 'offline' }, rule),
    undefined,
  );
  assert.equal(
    budgetUsageForRule({ phase: 'loaded', statuses: [] }, rule),
    undefined,
  );
  assert.equal(
    budgetUsageForRule({ phase: 'loaded', statuses: [status] }, rule),
    status,
  );
  const nonzero = { ...status, usedTokens: 105, usedRequests: 12 };
  assert.equal(
    budgetUsageForRule({ phase: 'loaded', statuses: [nonzero] }, rule),
    nonzero,
  );
});

test('budget usage rejects mismatched rules and invalid usage instead of displaying stale progress', () => {
  for (const change of [
    { ruleId: 'different' },
    { period: 'month' as const },
    { providerId: 'other' },
    { tokenLimit: 200 },
    { requestLimit: 20 },
    { usedTokens: NaN },
    { usedTokens: -1 },
    { usedRequests: Infinity },
    { usedRequests: -1 },
  ]) {
    assert.equal(
      budgetUsageForRule(
        { phase: 'loaded', statuses: [{ ...status, ...change }] },
        rule,
      ),
      undefined,
    );
  }
});

test('snippets only announce success and dismiss drafts or confirmations after confirmed persistence', async () => {
  const source = await read(snippetsPath);
  assert.match(source, /const persist = async[\s\S]*?Promise<boolean>/);
  assert.match(source, /if \(busyRef\.current\) return false/);
  assert.match(
    source,
    /const saved = await onChangeSettings[\s\S]*?if \(!saved\) \{[\s\S]*?setSaveError[\s\S]*?return false;[\s\S]*?toast\.success/,
  );
  assert.match(source, /if \(saved\) setEditor\(null\)/);
  assert.match(source, /if \(saved\) setDeletingId\(null\)/);
  assert.doesNotMatch(
    source,
    /set(?:Editor|DeletingId)\(null\);\s*await persist/,
  );
  assert.match(source, /!isSnippetDraftValid\(editor\)/);
  assert.match(source, /isConfirmDisabled=\{busy \|\| !canSave\}/);
  assert.match(source, /role="alert"/);
});

test('snippet controls use fixed-pixel touch targets, associated labels and one autofocus', async () => {
  const source = await read(snippetsPath);
  assert.equal(
    (source.match(/size-\[44px\] min-h-\[44px\] min-w-\[44px\]/g) ?? []).length,
    4,
  );
  assert.equal((source.match(/\bautoFocus\b/g) ?? []).length, 1);
  assert.match(source, /<Input[\s\S]*?autoFocus/);
  for (const id of ['titleId', 'contentId']) {
    assert.ok(source.includes(`htmlFor={${id}}`));
    assert.ok(source.includes(`id={${id}}`));
  }
  assert.match(source, /aria-describedby=\{countId\}/);
  assert.match(
    source,
    /aria-invalid=\{editor\.content\.length > MAX_CONTENT_LENGTH\}/,
  );
  assert.match(source, /className="min-h-\[44px\] w-full sm:w-auto"/);
  assert.match(source, /disabled=\{busy\}/);
});

test('all wizard settings writes check false and every step action shares a synchronous busy guard', async () => {
  const source = await read(wizardPath);
  for (const action of ['saveWelcome', 'finish', 'enableEmbeddings']) {
    const body = source
      .split(`const ${action} = async () => {`)[1]
      ?.split('\n  };')[0];
    assert.ok(body, `${action} exists`);
    assert.match(body, /operationRef\.current \|\|/);
    assert.match(body, /operationRef\.current = true/);
    assert.match(body, /const saved = await onChangeSettings/);
    assert.match(
      body,
      /if \(!saved\) \{\s*setActionError\(t\('errors\.actionFailed'\)\);\s*return;/,
    );
    assert.match(body, /finally \{\s*operationRef\.current = false;/);
  }
  assert.match(
    source,
    /const blocked =[\s\S]*?busy[\s\S]*?testing[\s\S]*?editor\.isOpen[\s\S]*?editor\.saving/,
  );
  assert.match(
    source,
    /const goToStep =[\s\S]*?if \(operationRef\.current \|\| blocked\) return/,
  );
  assert.match(source, /isDisabled=\{blocked\}[\s\S]*?void finish\(\)/);
  assert.match(source, /onPress=\{\(\) => goToStep\(3\)\}/);
  assert.match(source, /onPress=\{\(\) => goToStep\(4\)\}/);
  assert.doesNotMatch(source, /onPress=\{\(\) => setStep/);
  assert.match(source, /isDisabled=\{blocked \|\| !embeddingModel\.trim\(\)\}/);
});

test('wizard inputs, language selection and step changes are accessible', async () => {
  const source = await read(wizardPath);
  for (const id of ['nameId', 'modelId']) {
    assert.ok(source.includes(`htmlFor={${id}}`));
    assert.ok(source.includes(`id={${id}}`));
  }
  assert.match(source, /aria-pressed=\{language === choice\.value\}/);
  assert.match(source, /aria-labelledby=\{languageId\}/);
  assert.match(
    source,
    /role="status"\s*aria-live="polite"\s*aria-atomic="true"/,
  );
  assert.match(source, /t\('stepProgress', \{/);
  assert.match(source, /headingRef\.current\?\.focus\(\)/);
  assert.equal((source.match(/ref=\{headingRef\}/g) ?? []).length, 4);
  assert.match(source, /fieldset disabled=\{blocked\}/);
  assert.match(source, /flex flex-col items-start[\s\S]*?sm:flex-row/);
});

test('translation identity changes remount request state and a closed modal renders nothing', () => {
  const props = {
    message: { id: 'message-1', content: 'Hello' } as Message,
    targetLanguage: 'en',
    onTranslate: async () => 'Hello',
    onClose: () => {},
  };
  const original = TranslateMessageModal(props)!;
  assert.equal(TranslateMessageModal({ ...props, message: null }), null);
  assert.notEqual(
    TranslateMessageModal({
      ...props,
      message: { ...props.message, id: 'message-2' },
    })!.key,
    original.key,
  );
  assert.notEqual(
    TranslateMessageModal({
      ...props,
      message: { ...props.message, content: 'Edited' },
    })!.key,
    original.key,
  );
  assert.notEqual(
    TranslateMessageModal({ ...props, targetLanguage: 'ru' })!.key,
    original.key,
  );
  assert.equal(
    renderToStaticMarkup(
      createElement(TranslateMessageModal, { ...props, message: null }),
    ),
    '',
  );
});

test('translation dismissal invalidates late responses and failures stay recoverable', async () => {
  const source = await read(translatePath);
  assert.match(
    source,
    /const dismiss = \(\) => \{\s*requestRef\.current \+= 1;[\s\S]*?setDismissed\(true\);\s*onClose\(\)/,
  );
  assert.match(source, /onOpenChange=\{\(open\) => !open && dismiss\(\)\}/);
  assert.doesNotMatch(
    source,
    /!loading && onClose|isDisabled=\{loading\} onPress=\{onClose\}/,
  );
  assert.match(
    source,
    /const isCurrent = \(\) => active && request === requestRef\.current/,
  );
  assert.match(source, /if \(!isCurrent\(\)\) return/);
  assert.match(
    source,
    /return \(\) => \{\s*active = false;\s*requestRef\.current \+= 1/,
  );
  assert.match(source, /if \(!text\.trim\(\)\)/);
  assert.match(source, /if \(pendingRef\.current \|\| dismissed\) return/);
  assert.match(source, /onPress=\{retry\}/);
  assert.match(source, /t\('actions\.retry', \{ ns: 'common' \}\)/);
  assert.match(source, /role="alert"/);
  assert.match(source, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(source, /aria-busy=\{loading\}/);
  assert.match(source, /motion-reduce:animate-none/);
});

test('translation uses the clipboard adapter with visible errors and selectable bounded text', async () => {
  const source = await read(translatePath);
  assert.match(
    source,
    /await copyChatText\(translated, t\('translateModal\.copied'\)\)/,
  );
  assert.match(source, /catch \(caught\)[\s\S]*?setCopyError/);
  assert.doesNotMatch(source, /navigator\.clipboard/);
  assert.match(source, /copyingRef\.current \|\| dismissed/);
  assert.equal((source.match(/select-text/g) ?? []).length, 2);
  assert.equal((source.match(/max-h-\[min\(30dvh,16rem\)\]/g) ?? []).length, 2);
  assert.equal((source.match(/tabIndex=\{0\}/g) ?? []).length, 2);
  assert.match(source, /whitespace-pre-wrap break-words/);
});

test('budget state refreshes on applicable inputs and ignores superseded responses', async () => {
  const source = await read(budgetsPath);
  assert.match(source, /usage\?: readonly UsagePoint\[\]/);
  assert.match(source, /\[rules, providers, usage, onGetStatus, retry\]/);
  assert.match(source, /result\?\.source === source/);
  assert.match(source, /phase: 'loading'/);
  assert.match(source, /phase: 'error'/);
  assert.match(source, /phase: 'loaded'/);
  assert.match(source, /if \(active\)\s*setResult/);
  assert.match(source, /return \(\) => \{\s*active = false;/);
  assert.match(source, /onPress=\{retryStatuses\}/);
  assert.match(source, /const status = budgetUsageForRule\(loadState, rule\)/);
  assert.match(source, /\{status \? \(/);
  assert.doesNotMatch(source, /status\?\.used(?:Tokens|Requests) \?\? 0/);
  assert.match(source, /aria-valuetext=\{usedLabel\}/);
});

test('budget saves keep drafts on false or rejection and serialize add/delete', async () => {
  const source = await read(budgetsPath);
  assert.match(source, /if \(savingRef\.current\) return false/);
  assert.match(
    source,
    /const saved = await onChangeSettings[\s\S]*?if \(!saved\) \{[\s\S]*?setSaveError[\s\S]*?return false/,
  );
  assert.match(source, /catch \(caught\)[\s\S]*?return false/);
  assert.match(source, /if \(saved\)\s*setDraft/);
  assert.match(source, /await persist\(settings\.budgets\.filter/);
  assert.match(source, /fieldset disabled=\{saving\}/);
  assert.match(source, /isDisabled=\{saving \|\| !canAdd\}/);
  assert.match(source, /grid grid-cols-1 gap-3 sm:grid-cols-2/);
  assert.match(source, /role="alert"/);
});
