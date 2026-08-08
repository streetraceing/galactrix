export type ComposerInsertion = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export function insertRoleplayAction(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): ComposerInsertion {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);
  const prefix =
    start === value.length && before && !/\s$/.test(before) ? ' ' : '';
  const wrapped = `*${selected}*`;
  const nextValue = `${before}${prefix}${wrapped}${after}`;
  const contentStart = start + prefix.length + 1;

  return {
    value: nextValue,
    selectionStart: contentStart,
    selectionEnd: contentStart + selected.length,
  };
}
