import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

type ResizeHandleProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  onCollapse?: () => void;
  onCollapseCommit?: () => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  collapsed?: boolean;
  collapsedValue?: number;
  collapseThreshold?: number;
  resumeThreshold?: number;
  label: string;
  className?: string;
  shift?: boolean;
};

export function ResizeHandle({
  value,
  min,
  max,
  onChange,
  onCommit,
  onCollapse,
  onCollapseCommit,
  onResizeStart,
  onResizeEnd,
  collapsed = false,
  collapsedValue = 0,
  collapseThreshold = 48,
  resumeThreshold = 12,
  label,
  className = '',
  shift = false,
}: ResizeHandleProps) {
  const latestValue = useRef(value);

  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={collapsed ? collapsedValue : min}
      aria-valuemax={max}
      aria-valuenow={Math.round(collapsed ? collapsedValue : value)}
      tabIndex={0}
      className={`group relative block w-1 shrink-0 cursor-col-resize touch-none bg-transparent ${className}`}
      onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
        const startX = event.clientX;
        const startedCollapsed = collapsed;
        const target = event.currentTarget;
        let dragCollapsed = startedCollapsed;
        let expandedOriginX = startX;
        let expandedOriginValue = value;
        let expandAtX = startedCollapsed
          ? startX + Math.max(resumeThreshold, min - collapsedValue)
          : null;
        let changedDuringDrag = false;
        let finished = false;

        event.preventDefault();
        target.setPointerCapture(event.pointerId);
        document.body.dataset.resizing = 'true';
        onResizeStart?.();

        const cleanup = (pointerId: number) => {
          if (finished) return;
          finished = true;
          if (target.hasPointerCapture(pointerId)) {
            target.releasePointerCapture(pointerId);
          }
          document.body.removeAttribute('data-resizing');
          onResizeEnd?.();
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', end);
          window.removeEventListener('pointercancel', end);
        };

        const move = (moveEvent: PointerEvent) => {
          if (dragCollapsed) {
            if (expandAtX == null || moveEvent.clientX < expandAtX) return;

            dragCollapsed = false;
            expandedOriginX = expandAtX;
            expandedOriginValue = min;
            const next = clamp(
              expandedOriginValue + (moveEvent.clientX - expandedOriginX),
            );
            latestValue.current = next;
            changedDuringDrag = true;
            onChange(next);
            return;
          }

          const rawValue =
            expandedOriginValue + (moveEvent.clientX - expandedOriginX);

          if (rawValue < min - collapseThreshold && onCollapse) {
            dragCollapsed = true;
            changedDuringDrag = false;
            expandAtX = moveEvent.clientX + resumeThreshold;
            onCollapse();
            return;
          }

          const next = clamp(rawValue);
          latestValue.current = next;
          changedDuringDrag = true;
          onChange(next);
        };

        const end = (upEvent: PointerEvent) => {
          cleanup(upEvent.pointerId);
          if (dragCollapsed) {
            onCollapseCommit?.();
          } else if (changedDuringDrag) {
            onCommit(latestValue.current);
          }
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();

        if (collapsed) {
          if (event.key === 'ArrowRight') {
            onChange(min);
            onCommit(min);
          }
          return;
        }

        if (event.key === 'ArrowLeft' && value <= min && onCollapse) {
          onCollapse();
          onCollapseCommit?.();
          return;
        }

        const next = clamp(value + (event.key === 'ArrowRight' ? 12 : -12));
        onChange(next);
        onCommit(next);
      }}
    >
      <span
        className={clsx(
          'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-separator transition-colors group-hover:bg-accent group-focus-visible:bg-accent',
          shift && '-ml-0.5',
        )}
      />
    </div>
  );
}
