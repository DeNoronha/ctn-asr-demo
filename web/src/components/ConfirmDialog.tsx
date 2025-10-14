import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import { Button } from '@progress/kendo-react-buttons';
import type React from 'react';
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
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onCancel(); // Close dialog after action
  };

  return (
    <Dialog title={title} onClose={onCancel} width={450}>
      <div className="confirm-dialog-content">
        {icon && <div className="confirm-dialog-icon">{icon}</div>}
        <p className="confirm-dialog-message">{message}</p>
      </div>

      <DialogActionsBar>
        <Button onClick={onCancel}>{cancelLabel}</Button>
        <Button
          themeColor={confirmTheme}
          onClick={handleConfirm}
          className={confirmTheme === 'error' ? 'k-button-error' : ''}
        >
          {confirmLabel}
        </Button>
      </DialogActionsBar>
    </Dialog>
  );
};
