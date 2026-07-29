export const semanticMessages: Record<
  string,
  readonly [ru: string, en: string]
> = {
  'galaxy.kind.persona': ['Персона', 'Persona'],
  'galaxy.kind.character': ['Персонаж', 'Character'],
  'galaxy.kind.universe': ['Вселенная', 'Universe'],
  'galaxy.kind.worldbook': ['Ворлдбук', 'Worldbook'],
  'galaxy.kind.style': ['Стиль', 'Style'],
  'galaxy.kind.promptSet': ['Набор', 'Prompt set'],
  'weekday.mon': ['Пн', 'Mon'],
  'weekday.tue': ['Вт', 'Tue'],
  'weekday.wed': ['Ср', 'Wed'],
  'weekday.thu': ['Чт', 'Thu'],
  'weekday.fri': ['Пт', 'Fri'],
  'weekday.sat': ['Сб', 'Sat'],
  'weekday.sun': ['Вс', 'Sun'],
  'time.now': ['сейчас', 'now'],
  'time.longAgo': ['давно', 'long ago'],
};

export const semanticPatterns: Array<
  readonly [pattern: RegExp, ru: string, en: string]
> = [
  [/^time\.minutes:(\d+)$/u, '$1 мин', '$1 min ago'],
  [/^time\.hours:(\d+)$/u, '$1 ч', '$1 hr ago'],
  [/^time\.days:(\d+)$/u, '$1 дн', '$1 d ago'],
];
