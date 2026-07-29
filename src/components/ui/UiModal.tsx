import { Modal } from '@heroui/react';
import type { ReactNode } from 'react';
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

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        variant="blur"
        className={isMobile ? 'h-full! min-h-full! max-h-full!' : undefined}
      >
        <Modal.Container
          size={isMobile ? 'full' : size}
          scroll="inside"
          className={isMobile ? 'h-full! min-h-full! max-h-full!' : undefined}
        >
          <Modal.Dialog
            className={
              isMobile
                ? 'h-full min-h-full max-h-full min-w-0 rounded-none ring-0'
                : 'max-h-[90dvh] min-w-0 border-transparent'
            }
          >
            <Modal.CloseTrigger />
            <Modal.Header className="pr-10">
              <Modal.Heading>{title}</Modal.Heading>
              {description ? (
                <p className="mt-1 text-sm text-muted">{description}</p>
              ) : null}
            </Modal.Header>
            <Modal.Body className="scrollbar-thin min-w-0 overflow-x-hidden overflow-y-auto scrollbar-gutter-stable">
              {children}
            </Modal.Body>
            {footer ? <Modal.Footer>{footer}</Modal.Footer> : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
