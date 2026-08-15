import { useLayoutEffect } from 'react';
import { rememberExpandedLayoutViewport } from '../lib/mobileViewport';

export function useStableMobileLayoutViewport(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;

    const visualViewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        rememberExpandedLayoutViewport();
      });
    };

    rememberExpandedLayoutViewport();
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    visualViewport?.addEventListener('resize', update);
    window.screen.orientation?.addEventListener('change', update);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      visualViewport?.removeEventListener('resize', update);
      window.screen.orientation?.removeEventListener('change', update);
    };
  }, [active]);
}
