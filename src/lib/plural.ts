import { englishPluralForms } from '../i18n/en';
import { formatNumber, getLocale, translateText } from '../i18n';

export type RussianPluralForms = readonly [
  one: string,
  few: string,
  many: string,
];

export function pluralRu(value: number, forms: RussianPluralForms) {
  if (getLocale() === 'en') {
    const translated = englishPluralForms[forms.join('|')];
    if (translated) return value === 1 ? translated[0] : translated[1];
    return translateText(value === 1 ? forms[0] : forms[2]);
  }

  const absolute = Math.abs(Math.trunc(value));
  const lastTwo = absolute % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];

  const last = absolute % 10;
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

export function countRu(value: number, forms: RussianPluralForms) {
  return `${formatNumber(value)} ${pluralRu(value, forms)}`;
}
