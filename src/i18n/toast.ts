import { toast as heroToast } from '@heroui/react';
import type { ReactNode } from 'react';
import { translateText } from './index';

type ToastOptions = Parameters<typeof heroToast>[1];
type VariantToastOptions = Parameters<typeof heroToast.success>[1];

function localizeNode(value: ReactNode): ReactNode {
  return typeof value === 'string' ? translateText(value) : value;
}

function localizeOptions(
  options?: ToastOptions | VariantToastOptions,
): ToastOptions | undefined {
  if (!options || typeof options.description !== 'string') return options;
  return {
    ...options,
    description: translateText(options.description),
  };
}

const show = (message: ReactNode, options?: ToastOptions) =>
  heroToast(localizeNode(message), localizeOptions(options));

export const toast: typeof heroToast = Object.assign(show, {
  success: (message: ReactNode, options?: VariantToastOptions) =>
    heroToast.success(localizeNode(message), localizeOptions(options)),
  danger: (message: ReactNode, options?: VariantToastOptions) =>
    heroToast.danger(localizeNode(message), localizeOptions(options)),
  info: (message: ReactNode, options?: VariantToastOptions) =>
    heroToast.info(localizeNode(message), localizeOptions(options)),
  warning: (message: ReactNode, options?: VariantToastOptions) =>
    heroToast.warning(localizeNode(message), localizeOptions(options)),
  promise: heroToast.promise,
  getQueue: heroToast.getQueue,
  close: heroToast.close,
  pauseAll: heroToast.pauseAll,
  resumeAll: heroToast.resumeAll,
  clear: heroToast.clear,
});
