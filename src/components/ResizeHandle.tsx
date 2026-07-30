import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

type ResizeHandleProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
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
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      className={`group relative block w-1 shrink-0 cursor-col-resize touch-none bg-transparent ${className}`}
      onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
        const startX = event.clientX;
        const startValue = value;
        const target = event.currentTarget;
        target.setPointerCapture(event.pointerId);
        document.body.dataset.resizing = 'true';

        const move = (moveEvent: PointerEvent) => {
          const next = clamp(startValue + moveEvent.clientX - startX);
          latestValue.current = next;
          onChange(next);
        };
        const end = (upEvent: PointerEvent) => {
          if (target.hasPointerCapture(upEvent.pointerId)) {
            target.releasePointerCapture(upEvent.pointerId);
          }
          document.body.removeAttribute('data-resizing');
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', end);
          window.removeEventListener('pointercancel', end);
          onCommit(latestValue.current);
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
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
