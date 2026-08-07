import assert from 'node:assert/strict';
import test from 'node:test';
import {
  consumeGalaxyQuickCreate,
  requestGalaxyQuickCreate,
} from '../../src/lib/galaxyQuickCreate';

test('Galaxy quick create survives navigation until the target screen consumes it', () => {
  requestGalaxyQuickCreate('style');
  assert.equal(consumeGalaxyQuickCreate(), 'style');
  assert.equal(consumeGalaxyQuickCreate(), null);
});

test('generic Galaxy quick create keeps the current-library intent', () => {
  requestGalaxyQuickCreate();
  assert.equal(consumeGalaxyQuickCreate(), 'current');
});
