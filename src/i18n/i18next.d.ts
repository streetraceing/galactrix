import 'i18next';
import type { resources } from './resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    fallbackNS: 'common';
    keySeparator: false;
    returnNull: false;
    resources: (typeof resources)['en'];
  }
}
