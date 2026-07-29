import { Fragment, jsxDEV as reactJsxDev } from 'react/jsx-dev-runtime';
import { localizeJsxProps } from './runtime';

export const jsxDEV: typeof reactJsxDev = (
  type,
  props,
  key,
  isStaticChildren,
  source,
  self,
) =>
  reactJsxDev(
    type,
    localizeJsxProps(props),
    key,
    isStaticChildren,
    source,
    self,
  );

export { Fragment };
export type { JSX } from 'react/jsx-dev-runtime';
