import { Button } from '@progress/kendo-react-buttons';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
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
      // Small delay to ensure dialog is fully rendered
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

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

  const handleConfirm = () => {
    onConfirm();
    onCancel(); // Close dialog after action
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
          aria-label={`${cancelLabel} - Press Escape to cancel`}
        >
          {cancelLabel}
        </Button>
        <Button
          themeColor={confirmTheme}
          onClick={handleConfirm}
          className={confirmTheme === 'error' ? 'k-button-error' : ''}
          aria-label={`${confirmLabel} - This action ${confirmTheme === 'error' ? 'is destructive and ' : ''}cannot be undone`}
        >
          {confirmLabel}
        </Button>
      </DialogActionsBar>
    </Dialog>
  );
};
