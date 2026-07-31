import { Modal } from '@heroui/react';
import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useMobileBackEntry } from '../../hooks/useMobileBackEntry';
import { isMobilePlatform } from '../../lib/platform';

export function UiModal({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  onConfirm,
  isConfirmDisabled = false,
  bodyClassName,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'cover' | 'full';
  onConfirm?: () => void;
  isConfirmDisabled?: boolean;
  bodyClassName?: string;
}) {
  const isMobile = isMobilePlatform();
  const [mobileHeight, setMobileHeight] = useState<number>();

  useMobileBackEntry(isOpen, () => onOpenChange(false));

  useLayoutEffect(() => {
    if (!isOpen || !isMobile) {
      setMobileHeight(undefined);
      return;
    }

    const updateHeight = () => {
      const visualHeight = window.visualViewport?.height;
      const nextHeight = Math.round(
        visualHeight && visualHeight > 0
          ? visualHeight
          : Math.min(window.innerHeight, document.documentElement.clientHeight),
      );
      setMobileHeight(nextHeight);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    window.visualViewport?.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
      window.visualViewport?.removeEventListener('resize', updateHeight);
    };
  }, [isMobile, isOpen]);

  const mobileViewportStyle: CSSProperties | undefined =
    isMobile && mobileHeight
      ? {
          height: mobileHeight,
          minHeight: mobileHeight,
          maxHeight: mobileHeight,
        }
      : undefined;

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (
      !onConfirm ||
      isConfirmDisabled ||
      event.defaultPrevented ||
      event.repeat ||
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.altKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    const target =
      event.target instanceof HTMLElement ? event.target : undefined;
    if (!target) return;

    const isMultiline =
      target instanceof HTMLTextAreaElement || target.isContentEditable;
    if (isMultiline && !event.ctrlKey && !event.metaKey) return;

    if (
      target.closest(
        'button, a, [role="button"], [role="option"], [role="menuitem"], [role="checkbox"], [role="radio"], [role="slider"], [role="listbox"]',
      ) ||
      target.matches('[role="combobox"][aria-expanded="true"]')
    ) {
      return;
    }

    event.preventDefault();
    onConfirm();
  };

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        variant="blur"
        className={
          isMobile ? 'h-full min-h-0 max-h-full overflow-hidden' : undefined
        }
        style={mobileViewportStyle}
      >
        <Modal.Container
          size={isMobile ? 'full' : size}
          scroll="inside"
          className={
            isMobile
              ? 'h-full min-h-0 max-h-full w-full overflow-hidden p-0'
              : undefined
          }
        >
          <Modal.Dialog
            className={
              isMobile
                ? 'flex h-full min-h-0 max-h-full w-full max-w-none min-w-0 flex-col overflow-hidden rounded-none border-0! bg-background shadow-none! ring-0!'
                : 'ui-overlay-surface max-h-[90dvh] min-w-0 bg-background-secondary'
            }
            style={mobileViewportStyle}
          >
            <Modal.CloseTrigger />
            <div className="contents" onKeyDown={handleDialogKeyDown}>
              <Modal.Header className="shrink-0 border-b border-separator px-4 pb-3 pt-4 pr-12 sm:px-6 sm:pt-5">
                <Modal.Heading>{title}</Modal.Heading>
                {description ? (
                  <p className="mt-1 text-sm text-muted">{description}</p>
                ) : null}
              </Modal.Header>
              <Modal.Body
                className={`scrollbar-thin min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 scrollbar-gutter-stable ${bodyClassName ?? ''}`}
              >
                {children}
              </Modal.Body>
              {footer ? (
                <Modal.Footer className="shrink-0 gap-2 border-t border-separator px-4 py-3 [&>button]:min-h-11 [&>button]:flex-1 sm:px-6 sm:[&>button]:flex-none">
                  {footer}
                </Modal.Footer>
              ) : null}
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
