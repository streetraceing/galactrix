import { useLayoutEffect, useState } from 'react';

const MIN_KEYBOARD_HEIGHT = 96;
const KEYBOARD_HEIGHT_RATIO = 0.16;

function isKeyboardInput(element: Element | null) {
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

function visibleViewportHeight() {
  return Math.round(
    Math.min(
      window.innerHeight,
      document.documentElement.clientHeight || window.innerHeight,
      window.visualViewport?.height ?? window.innerHeight,
    ),
  );
}

export function useMobileKeyboardVisibility(active: boolean) {
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    const viewport = window.visualViewport;
    let frame = 0;
    let baselineHeight = visibleViewportHeight();
    let viewportWidth = window.innerWidth;

    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const currentHeight = visibleViewportHeight();
        const currentWidth = window.innerWidth;

        if (Math.abs(currentWidth - viewportWidth) > 80) {
          viewportWidth = currentWidth;
          baselineHeight = currentHeight;
        }

        const hasKeyboardInput = isKeyboardInput(document.activeElement);
        if (!hasKeyboardInput) {
          baselineHeight = Math.max(baselineHeight, currentHeight);
        }

        const threshold = Math.max(
          MIN_KEYBOARD_HEIGHT,
          Math.round(baselineHeight * KEYBOARD_HEIGHT_RATIO),
        );
        const viewportContracted = baselineHeight - currentHeight > threshold;

        setVisible(hasKeyboardInput && viewportContracted);
      });
    };

    update();
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [active]);

  return visible;
}
