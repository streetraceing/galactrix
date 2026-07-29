import { useLayoutEffect, useState } from 'react';

export function useVisualViewportMetrics(active: boolean) {
  const [metrics, setMetrics] = useState({
    bottomInset: 0,
    viewportHeight: 0,
  });

  useLayoutEffect(() => {
    if (!active) {
      setMetrics({ bottomInset: 0, viewportHeight: 0 });
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) return;

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const layoutHeight = Math.max(
          window.innerHeight,
          document.documentElement.clientHeight,
        );
        const nextInset = Math.max(
          0,
          Math.round(layoutHeight - viewport.height - viewport.offsetTop),
        );
        const nextHeight = Math.round(viewport.height);
        setMetrics((current) =>
          Math.abs(current.bottomInset - nextInset) > 1 ||
          Math.abs(current.viewportHeight - nextHeight) > 1
            ? {
                bottomInset: nextInset,
                viewportHeight: nextHeight,
              }
            : current,
        );
      });
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      window.cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [active]);

  return metrics;
}
