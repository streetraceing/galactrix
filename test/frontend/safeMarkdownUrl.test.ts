import assert from 'node:assert/strict';
import test from 'node:test';
import {
  safeMarkdownImageSrc,
  safeMarkdownLinkHref,
} from '../../src/lib/safeMarkdownUrl.ts';

test('allows expected external links and anchors', () => {
  assert.equal(
    safeMarkdownLinkHref('https://example.com/a'),
    'https://example.com/a',
  );
  assert.equal(
    safeMarkdownLinkHref('mailto:user@example.com'),
    'mailto:user@example.com',
  );
  assert.equal(safeMarkdownLinkHref('#section'), '#section');
});

test('blocks executable and relative markdown links', () => {
  assert.equal(safeMarkdownLinkHref('javascript:alert(1)'), undefined);
  assert.equal(safeMarkdownLinkHref('data:text/html,unsafe'), undefined);
  assert.equal(safeMarkdownLinkHref('/local-route'), undefined);
});

test('blocks remote tracking images but permits local and embedded images', () => {
  assert.equal(
    safeMarkdownImageSrc('https://tracker.example/pixel.png'),
    undefined,
  );
  assert.equal(safeMarkdownImageSrc('file:///sdcard/secret.png'), undefined);
  assert.equal(
    safeMarkdownImageSrc('asset://localhost/avatar.png'),
    'asset://localhost/avatar.png',
  );
  assert.equal(
    safeMarkdownImageSrc('data:image/png;base64,AAAA'),
    'data:image/png;base64,AAAA',
  );
});
