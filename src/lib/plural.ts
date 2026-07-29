export type RussianPluralForms = readonly [
  one: string,
  few: string,
  many: string,
];

export function pluralRu(value: number, forms: RussianPluralForms) {
  const absolute = Math.abs(Math.trunc(value));
  const lastTwo = absolute % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];

  const last = absolute % 10;
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

export function countRu(value: number, forms: RussianPluralForms) {
  return `${value.toLocaleString('ru-RU')} ${pluralRu(value, forms)}`;
}
