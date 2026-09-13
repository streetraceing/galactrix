import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  budgetPercent,
  budgetsExceeded,
} from '../../src/features/profile/budgets';
import type { BudgetStatus } from '../../src/types';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

function status(overrides: Partial<BudgetStatus>): BudgetStatus {
  return {
    ruleId: 'rule-1',
    period: 'day',
    tokenLimit: 100,
    requestLimit: 0,
    usedTokens: 0,
    usedRequests: 0,
    exceeded: false,
    ...overrides,
  };
}

test('budget warnings only fire for rules that apply to the chat provider', () => {
  const statuses = [
    status({ ruleId: 'global', exceeded: true }),
    status({ ruleId: 'lab', providerId: 'provider-1', exceeded: true }),
    status({ ruleId: 'other', providerId: 'provider-2', exceeded: true }),
    status({ ruleId: 'not-over', providerId: 'provider-1', exceeded: false }),
  ];

  const forProvider1 = budgetsExceeded(statuses, 'provider-1');
  assert.deepEqual(
    forProvider1.map((rule) => rule.ruleId),
    ['global', 'lab'],
  );
  assert.deepEqual(
    budgetsExceeded(statuses, undefined).map((r) => r.ruleId),
    ['global'],
  );
});

test('progress percentages clamp to the full bar', () => {
  assert.equal(budgetPercent(50, 200), 25);
  assert.equal(budgetPercent(300, 200), 100);
  assert.equal(budgetPercent(0, 0), 0);
});

test('budgets persist in settings and warn before generations start', async () => {
  const [db, settingsStorage, models, lib, backend, controller, panel, router] =
    await Promise.all([
      read('src-tauri/src/db.rs'),
      read('src-tauri/src/db/settings.rs'),
      read('src-tauri/src/models.rs'),
      read('src-tauri/src/lib.rs'),
      read('src/lib/backend.ts'),
      read('src/app/useAppController.ts'),
      read('src/features/profile/components/BudgetsPanel.tsx'),
      read('src/app/AppScreenRouter.tsx'),
    ]);

  assert.match(db, /"app_settings",\s*"budgets_json"/);
  assert.match(settingsStorage, /budgets_json = \?22/);
  assert.match(settingsStorage, /pub\(crate\) fn budget_status/);
  assert.match(
    settingsStorage,
    /created_at >= \?1 AND \(\?2 IS NULL OR provider_id = \?2\)/,
  );
  assert.match(models, /pub struct BudgetSettings/);
  assert.match(models, /pub budgets: Vec<BudgetSettings>/);
  assert.match(lib, /fn get_budget_status/);
  assert.match(lib, /get_budget_status,/);
  assert.match(
    backend,
    /invokeBackend<BudgetStatus\[\]>\('get_budget_status'\)/,
  );
  // The warning fires before the generation starts, then never blocks it.
  assert.match(controller, /await warnIfBudgetExceeded\(chatId\);/);
  assert.match(controller, /toast\.danger\(/);
  assert.match(controller, /getBudgetStatus,/);
  assert.match(router, /onGetBudgetStatus=\{controller\.getBudgetStatus\}/);
  // The panel is keyboard accessible and shows readable progress.
  assert.match(panel, /role="progressbar"/);
  assert.match(panel, /focus-visible:ring-2 focus-visible:ring-focus/);
  assert.doesNotMatch(panel, /warning-foreground|success-foreground/);
});
