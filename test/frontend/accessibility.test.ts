import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootPath = fileURLToPath(new URL('../../', import.meta.url));

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'i18n') continue;
      files.push(...walk(full));
    } else if (entry.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

function sourceFiles() {
  return walk(path.join(rootPath, 'src'));
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

// Splits a native <button> element into attributes and body. Arrow functions
// inside attributes contain '>' characters, so the split scans for the first
// '>' that does not close an arrow.
function splitButtonElement(element) {
  let attrsEnd = element.length;
  for (const match of element.matchAll(/>/g)) {
    const position = match.index;
    if (position > 0 && element[position - 1] === '=') continue;
    attrsEnd = position;
    break;
  }
  return { attrs: element.slice(0, attrsEnd), body: element.slice(attrsEnd) };
}

function hasVisibleText(body) {
  const withoutTags = body.replace(/<[^>]*>/g, '');
  const withoutExpressions = withoutTags.replace(/\{[^{}]*\}/g, '').trim();
  return withoutExpressions.length > 0;
}

test('every icon-only control exposes an accessible name', () => {
  const violations = [];
  for (const filePath of sourceFiles()) {
    const source = readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(/<Button\b((?:[^>]|\n)*?)>/g)) {
      const tag = match[1];
      if (/isIconOnly/.test(tag) && !/aria-label/.test(tag)) {
        violations.push(
          `${path.relative(rootPath, filePath)}:${lineOf(source, match.index)}`,
        );
      }
    }
    for (const match of source.matchAll(/<button\b((?:.|\n)*?)<\/button>/g)) {
      const { attrs, body } = splitButtonElement(match[0]);
      if (!hasVisibleText(body) && !/aria-label/.test(match[0])) {
        violations.push(
          `${path.relative(rootPath, filePath)}:${lineOf(source, match.index)}`,
        );
      }
    }
  }
  assert.deepEqual(violations, [], 'icon-only controls need accessible names');
});

test('tinted banners never use the dark foreground tokens', () => {
  const violations = [];
  for (const filePath of sourceFiles()) {
    const source = readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(/className=\{?[`"]([^`"]*)[`"]/g)) {
      const className = match[1];
      if (
        /bg-(warning|success|danger|accent)\/\d\d/.test(className) &&
        /(warning|success|danger|accent)-foreground/.test(className)
      ) {
        violations.push(
          `${path.relative(rootPath, filePath)}:${lineOf(source, match.index)}`,
        );
      }
    }
  }
  assert.deepEqual(violations, [], 'use the color itself on translucent fills');
});

test('interactive custom controls keep visible keyboard focus rings', () => {
  const guardedFiles = [
    'src/features/chats/components/ChatSidebar.tsx',
    'src/features/chats/components/ChatTagsModal.tsx',
    'src/features/chats/components/VariantCompareModal.tsx',
    'src/features/chats/components/MessageContextInspectorModal.tsx',
    'src/features/chats/components/MessageRevisionsModal.tsx',
  ];
  for (const file of guardedFiles) {
    const source = readFileSync(path.join(rootPath, file), 'utf8');
    for (const match of source.matchAll(/<button\b((?:.|\n)*?)<\/button>/g)) {
      const { attrs, body } = splitButtonElement(match[0]);
      const line = lineOf(source, match.index);
      assert.match(
        attrs,
        /focus-visible/,
        `${file}:${line} needs a focus-visible ring`,
      );
      if (!hasVisibleText(body)) {
        assert.match(
          match[0],
          /aria-label/,
          `${file}:${line} icon-only button needs aria-label`,
        );
      }
    }
  }
  const css = readFileSync(path.join(rootPath, 'src/App.css'), 'utf8');
  assert.match(css, /prefers-reduced-motion/);
});

test('new touch targets meet the compact minimum size', () => {
  const sidebar = readFileSync(
    path.join(rootPath, 'src/features/chats/components/ChatSidebar.tsx'),
    'utf8',
  );
  const compare = readFileSync(
    path.join(
      rootPath,
      'src/features/chats/components/VariantCompareModal.tsx',
    ),
    'utf8',
  );
  assert.match(
    sidebar,
    /inline-flex shrink-0 cursor-pointer items-center rounded-full border px-3 py-1\.5/,
  );
  assert.match(compare, /cursor-pointer rounded-lg p-2 outline-none/);
  assert.match(compare, /inline-flex min-h-9 cursor-pointer items-center/);
});
