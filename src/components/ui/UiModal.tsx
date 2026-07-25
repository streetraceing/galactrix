import { Modal } from '@heroui/react';
import type { ReactNode } from 'react';

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
  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        variant="blur"
      >
        <Modal.Container size={size} scroll="inside">
          <Modal.Dialog className="max-h-[90dvh] min-w-0 bg-surface/75 backdrop-blur-md">
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
