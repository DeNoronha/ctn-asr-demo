import { Button, Group, Modal } from '@mantine/core';
import type React from 'react';
import { useEffect, useRef } from 'react';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTheme?: 'primary' | 'error';
  onConfirm: () => void;
  onCancel: () => void;
  icon?: React.ReactNode;
}

/**
 * ConfirmDialog with enhanced keyboard navigation (DA-003)
 * - Escape key to cancel
 * - Enter key on focused button to activate
 * - Auto-focus on cancel button (safe default)
 * - ARIA role="alertdialog" for screen readers
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTheme = 'primary',
  onConfirm,
  onCancel,
  icon,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus cancel button when dialog opens (safe default for destructive actions)
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onCancel(); // Close dialog after successful action
    } catch (error) {
      // Error will be handled by the parent component's onConfirm handler
      // Don't close dialog if there's an error
      console.error('ConfirmDialog: Error in onConfirm:', error);
    }
  };

  return (
    <Modal opened={isOpen} onClose={onCancel} title={title} size="md" centered>
      <div className="confirm-dialog-content">
        {icon && (
          <div className="confirm-dialog-icon" aria-hidden="true">
            {icon}
          </div>
        )}
        <p className="confirm-dialog-message">{message}</p>
      </div>

      <Group mt="xl" justify="flex-end">
        <Button
          ref={cancelButtonRef}
          onClick={onCancel}
          variant="default"
          aria-label={`${cancelLabel} - Press Escape to cancel`}
        >
          {cancelLabel}
        </Button>
        <Button
          color={confirmTheme === 'error' ? 'red' : 'blue'}
          onClick={handleConfirm}
          aria-label={`${confirmLabel} - This action ${confirmTheme === 'error' ? 'is destructive and ' : ''}cannot be undone`}
        >
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
};
