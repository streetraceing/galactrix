import { Modal } from '@heroui/react';
import { useLayoutEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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
  const [mobileHeight, setMobileHeight] = useState<number | null>(null);

  useMobileBackEntry(isOpen, () => onOpenChange(false));

  useLayoutEffect(() => {
    if (!isOpen || !isMobile) {
      setMobileHeight(null);
      return;
    }
    setMobileHeight(Math.round(window.innerHeight));
  }, [isMobile, isOpen]);

  const mobileStyle =
    isMobile && mobileHeight
      ? ({
          '--ui-modal-height': `${mobileHeight}px`,
        } as CSSProperties)
      : undefined;
  const mobileHeightClass =
    'h-(--ui-modal-height)! min-h-(--ui-modal-height)! max-h-(--ui-modal-height)!';

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        variant="blur"
        style={mobileStyle}
        className={isMobile ? mobileHeightClass : undefined}
      >
        <Modal.Container
          size={isMobile ? 'full' : size}
          scroll="inside"
          className={isMobile ? mobileHeightClass : undefined}
        >
          <Modal.Dialog
            className={
              isMobile
                ? `${mobileHeightClass} min-w-0 rounded-none ring-0`
                : 'max-h-[90dvh] min-w-0 border-transparent'
            }
          >
            <Modal.CloseTrigger />
            <Modal.Header className="shrink-0 pr-10">
              <Modal.Heading>{title}</Modal.Heading>
              {description ? (
                <p className="mt-1 text-sm text-muted">{description}</p>
              ) : null}
            </Modal.Header>
            <Modal.Body className="scrollbar-thin min-w-0 overflow-x-hidden overflow-y-auto scrollbar-gutter-stable">
              {children}
            </Modal.Body>
            {footer ? (
              <Modal.Footer className="shrink-0">{footer}</Modal.Footer>
            ) : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
