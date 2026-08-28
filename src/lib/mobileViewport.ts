export interface LayoutViewportSize {
  width: number;
  height: number;
}

export interface MobileModalViewport extends LayoutViewportSize {
  top: number;
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

/**
 * Keeps a full-height modal stable while the browser chrome changes, but makes
 * its actual dialog no taller than the visible viewport while an editable
 * field has the keyboard open. This prevents a focused textarea from being
 * covered by the Android/iOS software keyboard.
 */
export function constrainMobileModalViewport(
  layoutViewport: LayoutViewportSize | undefined,
  visualViewport: Pick<VisualViewport, 'height' | 'offsetTop'> | undefined,
  hasFocusedKeyboardInput: boolean,
): MobileModalViewport | undefined {
  if (!layoutViewport) return undefined;

  const visibleHeight = Math.round(visualViewport?.height ?? 0);
  const visibleTop = Math.max(0, Math.round(visualViewport?.offsetTop ?? 0));
  const usesVisibleViewport =
    hasFocusedKeyboardInput &&
    visibleHeight > 0 &&
    (visibleHeight < layoutViewport.height || visibleTop > 0);

  if (!usesVisibleViewport) return { ...layoutViewport, top: 0 };

  const top = Math.min(visibleTop, Math.max(0, layoutViewport.height - 1));
  return {
    width: layoutViewport.width,
    height: Math.max(1, Math.min(visibleHeight, layoutViewport.height - top)),
    top,
  };
}

export function resolveMobileModalViewport() {
  const layoutViewport = resolveExpandedLayoutViewport();
  const visualViewport =
    typeof window === 'undefined'
      ? undefined
      : (window.visualViewport ?? undefined);

  return constrainMobileModalViewport(
    layoutViewport,
    visualViewport,
    typeof document !== 'undefined' && isKeyboardInput(document.activeElement),
  );
}
