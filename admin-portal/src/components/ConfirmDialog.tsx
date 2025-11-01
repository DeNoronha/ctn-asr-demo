import { Button } from '@mantine/core';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import type React from 'react';
import { useEffect, useState } from 'react';
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
  const [cancelButtonElement, setCancelButtonElement] = useState<HTMLElement | null>(null);

  // Auto-focus cancel button when dialog opens (safe default for destructive actions)
  useEffect(() => {
    if (isOpen && cancelButtonElement) {
      // Small delay to ensure dialog is fully rendered
      setTimeout(() => {
        cancelButtonElement.focus();
      }, 100);
    }
  }, [isOpen, cancelButtonElement]);

  // Handle keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Escape key handled by Kendo Dialog onClose
    // Enter key on focused button handled by button's onClick

    // Additional shortcuts for convenience
    if (event.key === 'Enter' && event.target === event.currentTarget) {
      // If Enter pressed on dialog itself (not on button), default to cancel for safety
      event.preventDefault();
      onCancel();
    }
  };

  if (!isOpen) return null;

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
    <Dialog
      title={title}
      onClose={onCancel}
      width={450}
    >
      <div
        className="confirm-dialog-content"
        role="alertdialog"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onKeyDown={handleKeyDown}
      >
        {icon && <div className="confirm-dialog-icon" aria-hidden="true">{icon}</div>}
        <p id="confirm-dialog-message" className="confirm-dialog-message">{message}</p>
      </div>

      <DialogActionsBar>
        <Button
          onClick={onCancel}
          variant="default"
          aria-label={`${cancelLabel} - Press Escape to cancel`}
        >
          <span ref={(el) => setCancelButtonElement(el?.closest('button') || null)}>{cancelLabel}</span>
        </Button>
        <Button
          color={confirmTheme === 'error' ? 'red' : 'blue'}
          onClick={handleConfirm}
          aria-label={`${confirmLabel} - This action ${confirmTheme === 'error' ? 'is destructive and ' : ''}cannot be undone`}
        >
          {confirmLabel}
        </Button>
      </DialogActionsBar>
    </Dialog>
  );
};
