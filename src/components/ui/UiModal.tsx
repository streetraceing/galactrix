import { Modal } from '@heroui/react';
import {
  useLayoutEffect,
  useState,
  type CSSProperties,
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
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'cover' | 'full';
}) {
  const isMobile = isMobilePlatform();
  const [mobileHeight, setMobileHeight] = useState<number>();

  useMobileBackEntry(isOpen, () => onOpenChange(false));

  useLayoutEffect(() => {
    if (!isOpen || !isMobile) return;
    setMobileHeight(
      Math.round(
        Math.max(window.innerHeight, document.documentElement.clientHeight),
      ),
    );
  }, [isMobile, isOpen]);

  const mobileViewportStyle: CSSProperties | undefined =
    isMobile && mobileHeight
      ? {
          height: mobileHeight,
          minHeight: mobileHeight,
          maxHeight: mobileHeight,
        }
      : undefined;

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        variant="blur"
        className={isMobile ? 'h-full min-h-0' : undefined}
        style={mobileViewportStyle}
      >
        <Modal.Container
          size={isMobile ? 'full' : size}
          scroll="inside"
          className={isMobile ? 'h-full min-h-0 w-full p-0' : undefined}
        >
          <Modal.Dialog
            className={
              isMobile
                ? 'h-full min-h-0 w-full max-w-none min-w-0 rounded-none border-0! shadow-none! ring-0! bg-background-secondary'
                : 'max-h-[90dvh] min-w-0 border-transparent bg-background-secondary'
            }
            style={mobileViewportStyle}
          >
            <Modal.CloseTrigger />
            <Modal.Header className="shrink-0 px-4 pb-3 pt-4 pr-12 sm:px-6 sm:pt-5">
              <Modal.Heading>{title}</Modal.Heading>
              {description ? (
                <p className="mt-1 text-sm text-muted">{description}</p>
              ) : null}
            </Modal.Header>
            <Modal.Body className="scrollbar-thin min-w-0 overflow-x-hidden overflow-y-auto px-4 sm:px-6 scrollbar-gutter-stable">
              {children}
            </Modal.Body>
            {footer ? (
              <Modal.Footer className="shrink-0 gap-2 border-t border-separator px-4 py-3 [&>button]:min-h-11 [&>button]:flex-1 sm:px-6 sm:[&>button]:flex-none">
                {footer}
              </Modal.Footer>
            ) : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
