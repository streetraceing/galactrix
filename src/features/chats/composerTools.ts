export type ComposerInsertion = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

type WrapOptions = {
  before: string;
  after: string;
  addSpaceAtEnd?: boolean;
};

function wrapSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  {
    before: wrapperBefore,
    after: wrapperAfter,
    addSpaceAtEnd = false,
  }: WrapOptions,
): ComposerInsertion {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);
  const prefix =
    addSpaceAtEnd && start === value.length && before && !/\s$/.test(before)
      ? ' '
      : '';
  const nextValue = `${before}${prefix}${wrapperBefore}${selected}${wrapperAfter}${after}`;
  const contentStart = start + prefix.length + wrapperBefore.length;

  return {
    value: nextValue,
    selectionStart: contentStart,
    selectionEnd: contentStart + selected.length,
  };
}

export function insertRoleplayAction(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): ComposerInsertion {
  return wrapSelection(value, selectionStart, selectionEnd, {
    before: '*',
    after: '*',
    addSpaceAtEnd: true,
  });
}

export function insertBoldText(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): ComposerInsertion {
  return wrapSelection(value, selectionStart, selectionEnd, {
    before: '**',
    after: '**',
    addSpaceAtEnd: true,
  });
}

export function insertDialogueQuote(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): ComposerInsertion {
  return wrapSelection(value, selectionStart, selectionEnd, {
    before: '“',
    after: '”',
    addSpaceAtEnd: true,
  });
}

export function insertOocAside(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): ComposerInsertion {
  return wrapSelection(value, selectionStart, selectionEnd, {
    before: '((',
    after: '))',
    addSpaceAtEnd: true,
  });
}
