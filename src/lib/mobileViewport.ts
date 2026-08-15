export interface LayoutViewportSize {
  width: number;
  height: number;
}

const VIEWPORT_WIDTH_CHANGE_THRESHOLD = 80;

let expandedLayoutViewport: LayoutViewportSize | undefined;

export function isKeyboardInput(element: Element | null) {
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  if (!(element instanceof HTMLInputElement)) return false;

  return ![
    'button',
    'checkbox',
    'color',
    'file',
    'hidden',
    'image',
    'radio',
    'range',
    'reset',
    'submit',
  ].includes(element.type);
}

export function dismissMobileKeyboard() {
  const activeElement = document.activeElement;
  if (!isKeyboardInput(activeElement)) return false;

  (activeElement as HTMLElement).blur();
  return true;
}

export function readLayoutViewport(): LayoutViewportSize | undefined {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return undefined;
  }

  const width = Math.round(
    document.documentElement.clientWidth || window.innerWidth || 0,
  );
  const height = Math.round(
    document.documentElement.clientHeight || window.innerHeight || 0,
  );

  return width > 0 && height > 0 ? { width, height } : undefined;
}

export function mergeExpandedLayoutViewport(
  previous: LayoutViewportSize | undefined,
  current: LayoutViewportSize,
): LayoutViewportSize {
  if (
    !previous ||
    Math.abs(previous.width - current.width) > VIEWPORT_WIDTH_CHANGE_THRESHOLD
  ) {
    return current;
  }

  return {
    width: current.width,
    height: Math.max(previous.height, current.height),
  };
}

export function rememberExpandedLayoutViewport() {
  const current = readLayoutViewport();
  if (!current) return expandedLayoutViewport;

  expandedLayoutViewport = mergeExpandedLayoutViewport(
    expandedLayoutViewport,
    current,
  );
  return expandedLayoutViewport;
}

export function resolveExpandedLayoutViewport() {
  return rememberExpandedLayoutViewport();
}
