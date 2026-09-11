import { Tabs } from '@heroui/react';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon, type IconName } from '../Icon';

export type AppTabItem = {
  id: string;
  label: ReactNode;
  icon?: IconName;
  accessory?: ReactNode;
};

const EDGE_TOLERANCE = 1;

export function AppTabList({
  label,
  items,
  className,
}: {
  label: string;
  items: readonly AppTabItem[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // HeroUI renders both scroll chevrons unconditionally and its right-edge
  // check misses by fractional pixels, so the next chevron never hides on
  // scaled screens. Track the edges ourselves with a small tolerance.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scroller = container.querySelector<HTMLElement>(
      '.tabs__list-container__scroller',
    );
    const prev = container.querySelector<HTMLElement>(
      '.tabs__list-container__scroll-prev',
    );
    const next = container.querySelector<HTMLElement>(
      '.tabs__list-container__scroll-next',
    );
    if (!scroller || !prev || !next) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const canScrollPrev = scroller.scrollLeft > EDGE_TOLERANCE;
      const canScrollNext =
        scroller.scrollLeft + scroller.clientWidth <
        scroller.scrollWidth - EDGE_TOLERANCE;
      prev.style.visibility = canScrollPrev ? '' : 'hidden';
      next.style.visibility = canScrollNext ? '' : 'hidden';
    };
    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    scroller.addEventListener('scroll', requestUpdate, { passive: true });
    const observer = new ResizeObserver(requestUpdate);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener('scroll', requestUpdate);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  return (
    <div ref={containerRef} className="min-w-0">
      <Tabs.ListContainer className="app-tabs__list-container">
        <Tabs.List
          aria-label={label}
          className={cn('app-tabs__list', className)}
        >
          {items.map((item) => (
            <Tabs.Tab key={item.id} id={item.id}>
              {item.icon ? (
                <Icon name={item.icon} className="size-4 shrink-0" />
              ) : null}
              <span className="truncate">{item.label}</span>
              {item.accessory}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </div>
  );
}
