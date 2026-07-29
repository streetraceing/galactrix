import {
  Fragment,
  jsx as reactJsx,
  jsxs as reactJsxs,
} from 'react/jsx-runtime';
import { localizeJsxProps } from './runtime';

export const jsx: typeof reactJsx = (type, props, key) =>
  reactJsx(type, localizeJsxProps(props), key);

export const jsxs: typeof reactJsxs = (type, props, key) =>
  reactJsxs(type, localizeJsxProps(props), key);

export { Fragment };
export type { JSX } from 'react/jsx-runtime';
